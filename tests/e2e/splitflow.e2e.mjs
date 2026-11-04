import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { launch, startServer } from "./helpers.mjs";

const OUT = process.env.SHOTS ?? "/tmp/shots";
mkdirSync(OUT, { recursive: true });
const server = await startServer(new URL("../../dist", import.meta.url).pathname, 8123);
const browser = await launch();
const url = "http://127.0.0.1:8123/apps/splitflow/index.html";
let failures = 0;
const step = async (name, fn) => {
  try { await fn(); console.log("  ok  ", name); } catch (e) { failures++; console.log("  FAIL", name, "\n      ", e.message.split("\n")[0]); }
};

const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
await page.goto(url);

await step("estado vacío invita a crear un grupo", async () => {
  await page.getByRole("heading", { name: "Crea tu primer grupo" }).waitFor();
});
await step("crear grupo en COP", async () => {
  await page.getByLabel("Nombre del grupo").fill("Viaje a Cartagena");
  await page.getByLabel("Moneda").selectOption("COP");
  await page.getByRole("button", { name: "Crear grupo" }).click();
  await page.getByRole("heading", { name: "Para quedar a mano" }).waitFor();
  await page.getByText("Añade al menos dos personas").waitFor();
});
await step("añadir personas, rechaza duplicados", async () => {
  for (const n of ["Ana", "Beto", "Caro"]) {
    await page.getByLabel("Añadir persona").fill(n);
    await page.getByRole("button", { name: "Añadir", exact: true }).click();
  }
  await page.getByLabel("Añadir persona").fill("ana");
  await page.getByRole("button", { name: "Añadir", exact: true }).click();
  await page.getByRole("alert").getByText("Ya existe ana").waitFor();
});
await step("gasto equitativo 90.000 pagado por Ana", async () => {
  await page.getByLabel("Descripción").fill("Cena");
  await page.getByLabel("Monto (COP)").fill("90.000");
  await page.getByLabel("Pagó").selectOption({ label: "Ana" });
  await page.getByRole("button", { name: "Añadir gasto" }).click();
  const items = page.getByTestId("transfers").locator("li");
  await items.first().waitFor();
  assert.equal(await items.count(), 2);
  const text = (await page.getByTestId("transfers").innerText()).replace(/\s+/g, " ");
  assert.match(text, /Beto paga a Ana/);
  assert.match(text, /Caro paga a Ana/);
  assert.match(text, /30\.000/);
});
await step("porcentajes que no suman 100 muestran error claro", async () => {
  await page.getByLabel("Descripción").fill("Taxi");
  await page.getByLabel("Monto (COP)").fill("10000");
  await page.getByLabel("Pagó").selectOption({ label: "Beto" });
  await page.getByLabel("Por porcentaje").check();
  await page.getByLabel("% de Ana").fill("50");
  await page.getByLabel("% de Beto").fill("40");
  await page.getByLabel("Caro", { exact: false }).first().uncheck();
  await page.getByTestId("split-status").getByText(/Suma 90\.00 %/).waitFor();
  await page.getByRole("button", { name: "Añadir gasto" }).click();
  await page.getByRole("alert").getByText(/deben sumar 100/).waitFor();
});
await step("corregir a 50/50 y registrar", async () => {
  await page.getByLabel("% de Beto").fill("50");
  await page.getByRole("button", { name: "Añadir gasto" }).click();
  await page.getByText("Gasto añadido.").waitFor();
  assert.equal(await page.getByTestId("expenses").locator("li").count(), 2);
});
await step("saldos suman cero (Ana +65.000 → 60.000+5.000 netos)", async () => {
  const t = (await page.getByTestId("balances").innerText()).replace(/\s+/g, " ");
  // Ana: +90.000 -30.000 (cena) -5.000 (taxi) = +55.000 ; Beto: -30.000 +10.000 -5.000 = -25.000 ; Caro: -30.000
  assert.match(t, /Ana Le deben \$\s?55\.000/);
  assert.match(t, /Beto Debe \$\s?25\.000/);
  assert.match(t, /Caro Debe \$\s?30\.000/);
});
await step("persiste al recargar", async () => {
  await page.reload();
  await page.getByTestId("expenses").waitFor();
  assert.equal(await page.getByTestId("expenses").locator("li").count(), 2);
});
await step("exporta CSV", async () => {
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Exportar CSV" }).click()]);
  assert.match(dl.suggestedFilename(), /\.csv$/);
});
await step("borrar gasto requiere confirmar", async () => {
  await page.getByRole("button", { name: "Borrar Taxi" }).click();
  await page.getByRole("button", { name: /Confirmar borrado de Taxi/ }).click();
  await page.waitForFunction(() => document.querySelectorAll('[data-testid="expenses"] li').length === 1);
});
await step("sin desbordamiento horizontal en móvil", async () => {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(overflow <= 0, `desborde ${overflow}px`);
});
await page.screenshot({ path: `${OUT}/splitflow-mobile.png`, fullPage: true });

await step("modo oscuro y escritorio se renderizan", async () => {
  const dark = await browser.newContext({ viewport: { width: 1100, height: 900 }, colorScheme: "dark" });
  const p = await dark.newPage();
  await p.addInitScript((data) => localStorage.setItem("splitflow:v1", data), await page.evaluate(() => localStorage.getItem("splitflow:v1")));
  await p.goto(url);
  await p.getByRole("heading", { name: "Para quedar a mano" }).waitFor();
  await p.screenshot({ path: `${OUT}/splitflow-desktop-dark.png`, fullPage: true });
  await dark.close();
});
await step("sin errores de consola ni excepciones", async () => { assert.deepEqual(errors, []); });

await browser.close();
server.stop();
console.log(failures === 0 ? "E2E SplitFlow: TODO OK" : `E2E SplitFlow: ${failures} fallo(s)`);
process.exit(failures === 0 ? 0 : 1);
