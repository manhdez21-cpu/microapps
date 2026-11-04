import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { launch, startServer } from "./helpers.mjs";

const OUT = process.env.SHOTS ?? "/tmp/shots";
mkdirSync(OUT, { recursive: true });
const server = await startServer(new URL("../../dist", import.meta.url).pathname, 8131);
const browser = await launch();
let failures = 0;
const step = async (name, fn) => { try { await fn(); console.log("  ok  ", name); } catch (e) { failures++; console.log("  FAIL", name, "\n      ", e.message.split("\n")[0]); } };
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
const norm = (s) => s.replace(/\s+/g, " ");
const add = async (type, amount, note = "") => {
  await page.getByLabel("Tipo").selectOption(type);
  await page.getByLabel("Monto").fill(amount);
  if (note) await page.getByLabel("Nota (opcional)").fill(note);
  await page.getByRole("button", { name: "Añadir movimiento" }).click();
};

console.log("Caja Clara");
await page.goto("http://127.0.0.1:8131/apps/caja-clara/index.html");
await step("monto inválido muestra error", async () => {
  await page.getByRole("button", { name: "Añadir movimiento" }).click();
  assert.match(await page.getByRole("alert").innerText(), /monto válido/);
});
await step("fiado no suma al efectivo esperado", async () => {
  await page.getByLabel(/Fondo inicial/).fill("50.000");
  await add("cash_sale", "100.000");
  await add("credit_sale", "40.000", "Don Pedro");
  await add("expense_cash", "15.000", "hielo");
  assert.equal(await page.getByTestId("moves").locator("li").count(), 3);
  assert.match(norm(await page.getByTestId("expected").innerText()), /\$\s?135\.000/);
  assert.match(norm(await page.getByTestId("totals").innerText()), /Ventas del día: \$\s?140\.000/);
});
await step("faltante de 5.000", async () => {
  await page.getByLabel("Efectivo contado en la caja").fill("130.000");
  assert.match(norm(await page.getByTestId("verdict").innerText()), /Faltan \$\s?5\.000/i);
});
await step("cuadra exacto", async () => {
  await page.getByLabel("Efectivo contado en la caja").fill("135.000");
  assert.match(await page.getByTestId("verdict").innerText(), /cuadra/i);
});
await step("quitar un movimiento recalcula", async () => {
  await page.getByRole("button", { name: /Quitar Gasto/ }).click();
  assert.match(norm(await page.getByTestId("expected").innerText()), /\$\s?150\.000/);
  await page.getByLabel("Efectivo contado en la caja").fill("150.000");
});
await step("sin desborde horizontal en móvil", async () => {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
});
await page.screenshot({ path: `${OUT}/caja-clara-mobile.png`, fullPage: true });
await step("guardar cierre vacía la caja y llena el historial", async () => {
  await page.getByRole("button", { name: "Guardar cierre del día" }).click();
  assert.match(await page.getByRole("status").innerText(), /guardado/);
  assert.equal(await page.getByTestId("history").locator("li").count(), 1);
  assert.equal(await page.getByTestId("moves").count(), 0);
});
await step("persiste al recargar", async () => {
  await page.reload();
  assert.equal(await page.getByTestId("history").locator("li").count(), 1);
});
await step("reporte del día, la semana y el mes suma el cierre guardado", async () => {
  const r = page.getByTestId("report");
  assert.match(norm(await r.getByTestId("r-days").innerText()), /^1$/);
  assert.match(norm(await r.getByTestId("r-sales").innerText()), /\$\s?\d/);
  for (const p of ["Semana", "Mes"]) {
    await r.getByRole("button", { name: p, exact: true }).click();
    assert.match(norm(await page.getByTestId("report").getByTestId("r-days").innerText()), /^1$/);
  }
  await page.getByTestId("report").getByRole("button", { name: "Día", exact: true }).click();
  await page.getByTestId("report").locator("summary").click();
  assert.equal(await page.getByTestId("report").locator("table.recon tbody tr").count(), 1);
});
await step("periodo sin cierres lo dice", async () => {
  await page.getByLabel("Fecha").fill("2020-01-15");
  assert.equal(await page.getByTestId("report-empty").count(), 1);
});
await step("descarga CSV", async () => {
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Descargar CSV" }).click()]);
  assert.equal(dl.suggestedFilename(), "cierres-caja-clara.csv");
});
await step("datos corruptos en localStorage no rompen la app", async () => {
  await page.evaluate(() => { localStorage.setItem("cajaclara.history.v1", "{no json"); localStorage.setItem("cajaclara.draft.v1", "[]"); });
  await page.reload();
  assert.match(await page.locator("h1").innerText(), /Caja Clara/i);
});
await step("modo oscuro", async () => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.screenshot({ path: `${OUT}/caja-clara-dark.png`, fullPage: true });
});
await step("JSON-LD válido y sin errores de consola", async () => {
  const blocks = await page.$$eval('script[type="application/ld+json"]', (n) => n.map((x) => x.textContent));
  blocks.forEach((b) => JSON.parse(b));
  assert.deepEqual(errors, []);
});
await browser.close();
server.stop();
console.log(failures ? `${failures} FALLOS` : "TODO OK");
process.exit(failures ? 1 : 0);
