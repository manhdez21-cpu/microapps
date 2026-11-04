import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { launch, startServer } from "./helpers.mjs";

const OUT = process.env.SHOTS ?? "/tmp/shots";
mkdirSync(OUT, { recursive: true });
const server = await startServer(new URL("../../dist", import.meta.url).pathname, 8125);
const browser = await launch();
let failures = 0;
const step = async (name, fn) => { try { await fn(); console.log("  ok  ", name); } catch (e) { failures++; console.log("  FAIL", name, "\n      ", e.message.split("\n")[0]); } };
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
const norm = (s) => s.replace(/\s+/g, " ");

console.log("PriceRight");
await page.goto("http://127.0.0.1:8125/apps/priceright/index.html");
await step("sin costos muestra una guía, no un precio", async () => {
  assert.match(await page.getByTestId("hint").innerText(), /Añade al menos un costo/);
});
await step("materiales 80.000 + margen 20 % → 100.000 y ganancia 20.000", async () => {
  await page.getByLabel("Materiales").fill("80.000");
  await page.getByLabel("Porcentaje (%)").fill("20");
  assert.match(norm(await page.getByTestId("final-price").innerText()), /\$\s?100\.000/);
  assert.match(norm(await page.getByTestId("profit").innerText()), /\$\s?20\.000/);
  assert.match(norm(await page.getByTestId("output").innerText()), /Recargo equivalente 25,00 %/);
});
await step("fijar recargo 25 % da el mismo precio", async () => {
  await page.getByLabel("Un recargo sobre el costo").check();
  await page.getByLabel("Porcentaje (%)").fill("25");
  assert.match(norm(await page.getByTestId("net-price").innerText()), /\$\s?100\.000/);
});
await step("impuesto opcional: 19 % suma 19.000", async () => {
  await page.getByLabel("Impuesto (%)").fill("19");
  assert.match(norm(await page.getByTestId("final-price").innerText()), /\$\s?119\.000/);
});
await step("mano de obra 2,5 h × 20.000", async () => {
  await page.getByLabel("Materiales").fill("");
  await page.getByLabel("Impuesto (%)").fill("");
  await page.getByLabel("Un margen sobre el precio").check();
  await page.getByLabel("Horas de trabajo").fill("2,5");
  await page.getByLabel("Tarifa por hora").fill("20.000");
  await page.getByLabel("Porcentaje (%)").fill("20");
  assert.match(norm(await page.getByTestId("net-price").innerText()), /\$\s?62\.500/);
});
await step("margen + comisión ≥ 100 % da error claro", async () => {
  await page.getByLabel("Un margen sobre el precio").check();
  await page.getByLabel("Porcentaje (%)").fill("70");
  await page.getByLabel("Comisión (%)").fill("30");
  assert.match(await page.getByTestId("hint").innerText(), /menor que 100/);
});
await step("sin desborde horizontal", async () => {
  await page.getByLabel("Comisión (%)").fill("");
  await page.getByLabel("Porcentaje (%)").fill("30");
  assert.ok((await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0);
  await page.screenshot({ path: `${OUT}/priceright-mobile.png`, fullPage: true });
});
await step("JSON-LD válido en la página", async () => {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  assert.equal(blocks.length, 2);
  for (const b of blocks) JSON.parse(b);
});

console.log("¿Cuánto me sobra?");
await page.goto("http://127.0.0.1:8125/apps/cuanto-me-sobra/index.html");
await step("cerámica 4×3 m, pieza 50×50, 10 %, 8 por caja → 7 cajas", async () => {
  await page.getByLabel("Largo de la habitación (m)").fill("4");
  await page.getByLabel("Ancho de la habitación (m)").fill("3");
  await page.getByLabel("Largo de la pieza (cm)").fill("50");
  await page.getByLabel("Ancho de la pieza (cm)").fill("50");
  await page.getByLabel("Piezas por caja").fill("8");
  assert.match(await page.getByTestId("headline").innerText(), /7 cajas/);
  const t = norm(await page.getByTestId("output").innerText());
  assert.match(t, /Piezas netas 48/i);
  assert.match(t, /Piezas con desperdicio 53/);
  assert.match(t, /Piezas que sobran de las cajas 3/);
  assert.match(t, /Área = 4 m × 3 m = 12 m²/);
});
await step("pintura: exige rendimiento y calcula 7 litros", async () => {
  await page.getByRole("tab", { name: "Pintura" }).click();
  await page.getByLabel("Largo (m)").fill("4");
  await page.getByLabel("Ancho (m)").fill("3");
  assert.match(await page.getByTestId("hint").innerText(), /rendimiento/);
  await page.getByLabel("Rendimiento (m² por litro)").fill("10");
  assert.match(await page.getByTestId("headline").innerText(), /7 litros/);
  await page.screenshot({ path: `${OUT}/cuanto-mobile.png`, fullPage: true });
});
await step("sin desborde horizontal", async () => {
  assert.ok((await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0);
});
await step("sin errores de consola", async () => assert.deepEqual(errors, []));

await browser.close(); server.stop();
console.log(failures === 0 ? "E2E calculadoras: TODO OK" : `E2E calculadoras: ${failures} fallo(s)`);
process.exit(failures === 0 ? 0 : 1);
