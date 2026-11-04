import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { launch, startServer } from "./helpers.mjs";

const OUT = process.env.SHOTS ?? "/tmp/shots";
mkdirSync(OUT, { recursive: true });
const server = await startServer(new URL("../../dist", import.meta.url).pathname, 8124);
const browser = await launch();
const base = "http://127.0.0.1:8124/apps/control-center/index.html";
let failures = 0;
const step = async (name, fn) => { try { await fn(); console.log("  ok  ", name); } catch (e) { failures++; console.log("  FAIL", name, "\n      ", e.message.split("\n")[0]); } };

const page = await (await browser.newContext({ viewport: { width: 1100, height: 900 } })).newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
await page.goto(base);

await step("resumen muestra 7 apps y pruebas reales", async () => {
  await page.getByRole("heading", { name: "Resumen" }).waitFor();
  const text = await page.locator("main").innerText();
  assert.match(text, /Aplicaciones en el portafolio\s*Real\s*7/);
  assert.match(text, /Pruebas automáticas[\s\S]*\d+ de \d+/);
});
await step("métricas de negocio aparecen como pendientes, sin cifras inventadas", async () => {
  const pend = await page.locator(".tile.pendiente").count();
  assert.ok(pend >= 4, `tiles pendientes: ${pend}`);
  const t = await page.locator("main").innerText();
  assert.doesNotMatch(t, /Usuarios activos\s*Pendiente\s*\d/);
  assert.match(t, /Sin datos/);
});
await step("cada app tiene su ficha con cifras reales y pendientes etiquetadas", async () => {
  await page.getByRole("link", { name: "Aplicaciones" }).click();
  await page.getByTestId("app-splitflow").waitFor();
  for (const id of ["splitflow", "caja-clara", "priceright", "cuanto-me-sobra", "expiryhub", "warranty-keeper", "huella-al-dia"]) {
    const t = await page.getByTestId(`app-${id}`).innerText();
    assert.match(t, /Pruebas unitarias\s*Real\s*\d+ de \d+/, id);
    assert.match(t, /Líneas de código\s*Real\s*\d+/, id);
    assert.match(t, /Ingresos por anuncios\s*Pendiente\s*Sin datos/, id);
    assert.doesNotMatch(t, /Usuarios activos\s*Pendiente\s*\d/, id);
  }
  assert.match(await page.getByTestId("app-caja-clara").innerText(), /pendiente de credenciales/);
});
await step("operaciones lista pruebas por paquete sin fallos", async () => {
  await page.getByRole("link", { name: "Operaciones" }).click();
  await page.getByTestId("test-rows").waitFor();
  const t = await page.getByTestId("test-rows").innerText();
  assert.match(t, /packages\/core/);
  assert.equal(await page.locator(".rows .bad").count(), 0);
});
await step("inteligencia no inventa recomendaciones", async () => {
  await page.getByRole("link", { name: "Marketing" }).click();
  await page.getByRole("heading", { name: "Marketing" }).waitFor();
  await page.getByRole("link", { name: "Inteligencia" }).click();
  await page.getByText("no hay recomendaciones").waitFor();
});
await step("responsive sin desborde de página", async () => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.getByRole("link", { name: "Resumen" }).click();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(overflow <= 0, `desborde ${overflow}px`);
  await page.screenshot({ path: `${OUT}/cc-mobile.png`, fullPage: true });
});
await page.setViewportSize({ width: 1100, height: 900 });
await page.getByRole("link", { name: "Aplicaciones" }).click();
await page.getByTestId("app-splitflow").waitFor();
await page.screenshot({ path: `${OUT}/cc-apps.png`, fullPage: true });
await step("sin errores de consola", async () => assert.deepEqual(errors, []));

await browser.close(); server.stop();
console.log(failures === 0 ? "E2E Control Center: TODO OK" : `E2E Control Center: ${failures} fallo(s)`);
process.exit(failures === 0 ? 0 : 1);
