import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { launch, startServer } from "./helpers.mjs";
const OUT = process.env.SHOTS ?? "/tmp/shots";
mkdirSync(OUT, { recursive: true });
const server = await startServer(new URL("../../dist", import.meta.url).pathname, 8133);
const browser = await launch();
let failures = 0;
const step = async (name, fn) => { try { await fn(); console.log("  ok  ", name); } catch (e) { failures++; console.log("  FAIL", name, "\n      ", e.message.split("\n")[0]); } };
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
console.log("Huella al Día");
await page.goto("http://127.0.0.1:8133/apps/huella-al-dia/index.html");
await step("sin datos guía al usuario", async () => assert.match(await page.getByTestId("hint").innerText(), /al menos un consumo/));
await step("electricidad sin factor pide el factor", async () => {
  await page.getByLabel(/Electricidad al mes/).fill("150");
  assert.match(await page.getByTestId("hint").innerText(), /factor de emisión de electricidad/);
});
await step("con factor 0,2 y 40 L de gasolina da ≈1,4 t/año", async () => {
  await page.getByLabel(/Factor \(kg CO₂ por kWh\)/).fill("0,2");
  await page.getByLabel(/Gasolina al mes/).fill("40");
  // (150*0.2 + 40*2.2428)*12 /1000 = 1.4 t
  const t = await page.getByTestId("year").innerText();
  assert.match(t, /1,4\d? t CO₂ al año/);
});
await step("entrada inválida muestra error y no desborda", async () => {
  await page.getByLabel(/Diésel al mes/).fill("abc");
  assert.match(await page.getByTestId("hint").innerText(), /diésel/);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  await page.getByLabel(/Diésel al mes/).fill("");
  await page.screenshot({ path: `${OUT}/huella-mobile.png`, fullPage: true });
});
await step("JSON-LD válido y consola limpia", async () => {
  (await page.$$eval('script[type="application/ld+json"]', (n) => n.map((x) => x.textContent))).forEach((b) => JSON.parse(b));
  assert.deepEqual(errors, []);
});
await browser.close(); server.stop();
console.log(failures ? `${failures} FALLOS` : "TODO OK");
process.exit(failures ? 1 : 0);
