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
await step("con metrics.json real-simulado muestra cifras etiquetadas Real y sin Premium", async () => {
  const m = { source: "Google Analytics 4 (API de datos)", fetchedAt: "2026-11-04T12:00:00Z", range: "últimos 28 días", overall: { views: 1234, users: 321, newUsers: 300, returningUsers: 21, adRevenue: 4.5 }, apps: { "caja-clara": { views: 99, users: 40, newUsers: 30, returningUsers: 10, adRevenue: 1.25 } } };
  await page.route("**/data/metrics.json", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(m) }));
  await page.goto(`${base}#resumen`); await page.reload();
  await page.getByRole("heading", { name: "Resumen" }).waitFor();
  const t = await page.locator("main").innerText();
  assert.match(t, /Visitas \(páginas vistas\)\s*Real\s*1[.,\s]?234/);
  assert.match(t, /Usuarios que regresan\s*Real\s*21/);
  assert.doesNotMatch(t, /Premium/i);
  await page.getByRole("link", { name: "Aplicaciones" }).click();
  assert.match(await page.getByTestId("app-caja-clara").innerText(), /Visitas \(páginas vistas\)\s*Real\s*99/);
  await page.unroute("**/data/metrics.json");
});
await step("Negocio: sin datos dice pendiente; con datos muestra tabla por app, total y búsquedas", async () => {
  await page.goto(`${base}#negocio`); await page.reload();
  assert.match(await page.getByTestId("negocio").innerText(), /Sin datos: falta conectar Google Analytics/);
  const row = { views: 99, users: 40, newUsers: 30, returningUsers: 10, adRevenue: 1.25, sessions: 50, adImpressions: 1000, adClicks: 5, events: { share_click: 3, feedback_click: 2, install_click: 4 } };
  const m = { source: "Google Analytics 4 (API de datos)", fetchedAt: "2026-11-04T12:00:00Z", range: "últimos 28 días", overall: { ...row, adRevenue: 4.5 }, apps: { "caja-clara": row },
    daily: [{ date: "2026-11-03", users: 5, views: 9, adRevenue: 0.5 }], search: { site: "x", overall: { clicks: 7, impressions: 90, ctr: 7.78, position: 6.1 }, apps: { "caja-clara": { clicks: 7, impressions: 90, ctr: 7.78, position: 6.1 } }, queries: [{ query: "dividir gastos", clicks: 7, impressions: 90, position: 6.1 }] } };
  await page.route("**/data/metrics.json", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(m) }));
  await page.reload();
  await page.getByTestId("neg-table").waitFor();
  const t = await page.getByTestId("negocio").innerText();
  assert.match(t, /Caja Clara\s+40\s+30\s+10\s+99\s+1\.25\s+1\.25/);
  assert.match(t, /Total/); assert.match(t, /dividir gastos/); assert.match(t, /11-03/);
  await page.unroute("**/data/metrics.json");
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
