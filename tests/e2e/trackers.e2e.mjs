import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { launch, startServer } from "./helpers.mjs";

const OUT = process.env.SHOTS ?? "/tmp/shots";
mkdirSync(OUT, { recursive: true });
const server = await startServer(new URL("../../dist", import.meta.url).pathname, 8132);
const browser = await launch();
let failures = 0;
const step = async (name, fn) => { try { await fn(); console.log("  ok  ", name); } catch (e) { failures++; console.log("  FAIL", name, "\n      ", e.message.split("\n")[0]); } };
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
const ymd = (offset) => { const d = new Date(); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const noOverflow = async () => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);

console.log("ExpiryHub");
await page.goto("http://127.0.0.1:8132/apps/expiryhub/index.html");
await step("fecha vacía muestra error", async () => {
  await page.getByLabel("Producto", { exact: true }).fill("Leche");
  await page.getByRole("button", { name: "Añadir", exact: true }).click();
  assert.match(await page.getByRole("alert").innerText(), /fecha de vencimiento válida/);
});
await step("agrupa vencido / hoy / pronto / después", async () => {
  const add = async (name, off) => { await page.getByLabel("Producto", { exact: true }).fill(name); await page.getByLabel("Vence el").fill(ymd(off)); await page.getByRole("button", { name: "Añadir", exact: true }).click(); };
  await add("Leche", -1); await add("Yogur", 0); await add("Pan", 3); await add("Arroz", 90);
  for (const g of ["expired", "today", "soon", "later"]) assert.equal(await page.getByTestId(`group-${g}`).locator("li").count(), 1, g);
  assert.match(await page.getByTestId("group-expired").innerText(), /venció ayer/);
  assert.match(await page.getByTestId("summary").innerText(), /3 productos necesitan atención/);
});
await step("cambiar los días de aviso mueve productos", async () => {
  await page.getByLabel(/Avisarme/).fill("1"); await page.getByLabel(/Avisarme/).blur();
  assert.equal(await page.getByTestId("group-soon").count(), 0);
  assert.equal(await page.getByTestId("group-later").locator("li").count(), 2);
});
await step("persiste, quita y no desborda", async () => {
  await page.reload();
  assert.equal(await page.getByTestId("group-later").locator("li").count(), 2);
  await page.getByRole("button", { name: "Quitar Arroz" }).click();
  assert.equal(await page.getByTestId("group-later").locator("li").count(), 1);
  await noOverflow();
  await page.screenshot({ path: `${OUT}/expiryhub-mobile.png`, fullPage: true });
});
await step("descarga CSV y tolera datos corruptos", async () => {
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Descargar CSV" }).click()]);
  assert.equal(dl.suggestedFilename(), "vencimientos.csv");
  await page.evaluate(() => localStorage.setItem("expiryhub.v1", "{x"));
  await page.reload();
  assert.match(await page.locator("h1").innerText(), /ExpiryHub/);
});

console.log("Warranty Keeper");
await page.goto("http://127.0.0.1:8132/apps/warranty-keeper/index.html");
await step("meses inválidos muestran error", async () => {
  await page.getByLabel("Producto", { exact: true }).fill("Nevera");
  await page.getByLabel("Garantía en meses").fill("0");
  await page.getByRole("button", { name: "Añadir", exact: true }).click();
  assert.match(await page.getByRole("alert").innerText(), /1 a 240/);
});
await step("calcula fin, estado y orden", async () => {
  const add = async (name, buy, months) => { await page.getByLabel("Producto", { exact: true }).fill(name); await page.getByLabel("Fecha de compra").fill(buy); await page.getByLabel("Garantía en meses").fill(String(months)); await page.getByRole("button", { name: "Añadir", exact: true }).click(); };
  await add("Celular", "2020-01-31", 24);
  await add("TV", ymd(0), 36);
  await add("Licuadora", "2026-01-31", 1);
  const items = page.getByTestId("list").locator("li");
  assert.equal(await items.count(), 3);
  assert.match(await items.last().innerText(), /Celular[\s\S]*Vencida/);
  assert.match(await items.first().innerText(), /TV[\s\S]*Vigente|Licuadora/);
  assert.match(await page.getByTestId("list").innerText(), /2022-01-31/);
});
await step("persiste y no desborda", async () => {
  await page.reload();
  assert.equal(await page.getByTestId("list").locator("li").count(), 3);
  await noOverflow();
  await page.screenshot({ path: `${OUT}/warranty-mobile.png`, fullPage: true });
});
await step("modo oscuro, JSON-LD y consola limpia", async () => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.screenshot({ path: `${OUT}/warranty-dark.png`, fullPage: true });
  (await page.$$eval('script[type="application/ld+json"]', (n) => n.map((x) => x.textContent))).forEach((b) => JSON.parse(b));
  assert.deepEqual(errors, []);
});
await browser.close();
server.stop();
console.log(failures ? `${failures} FALLOS` : "TODO OK");
process.exit(failures ? 1 : 0);
