// E2E del módulo shared/pro en navegador real. Las apps aún NO lo usan: se carga dentro de cada app ya compilada
// para comprobar que convive con sus estilos. La clave pública de prueba se inyecta interceptando config.js (nada de esto existe en producción).
import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import { launch, startServer } from "./helpers.mjs";
import { generateKeys, signLicense } from "../../tools/pro-license.mjs";

const OUT = process.env.SHOTS ?? "/tmp/shots";
mkdirSync(OUT, { recursive: true });
const dist = new URL("../../dist", import.meta.url).pathname;
const server = await startServer(dist, 8141);
const browser = await launch();
const base = "http://127.0.0.1:8141";
const APPS = { splitflow: "SplitFlow", "caja-clara": "Caja Clara", priceright: "PriceRight", "huella-al-dia": "Huella al Día" };
const PAY = "https://pago.example/splitflow";
let failures = 0;
const step = async (name, fn) => { try { await fn(); console.log("  ok  ", name); } catch (e) { failures++; console.log("  FAIL", name, "\n      ", e.message.split("\n")[0]); } };

const keys = await generateKeys();
const license = { splitflow: await signLicense({ app: "splitflow", id: "E2E-0001" }, keys.privateKey), "caja-clara": await signLicense({ app: "caja-clara", id: "E2E-0002" }, keys.privateKey) };
const realConfig = readFileSync(`${dist}/shared/pro/src/config.js`, "utf8");
const testConfig = realConfig.replace("PRO_PUBLIC_KEYS = []", `PRO_PUBLIC_KEYS = ["${keys.publicKey}"]`).replace('checkoutUrl: ""', `checkoutUrl: "${PAY}"`); // solo la 1.ª app (SplitFlow) recibe enlace de pago
assert.notEqual(testConfig, realConfig, "no se pudo preparar la configuración de prueba");

const errors = [];
const open = async ({ app = "splitflow", query = "", withKey = true, dark = false } = {}) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: dark ? "dark" : "light", serviceWorkers: "block" }); // el service worker de la app saltaría la intercepción de config.js
  const page = await ctx.newPage();
  const requested = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("request", (r) => requested.push(r.url()));
  if (withKey) await page.route("**/shared/pro/src/config.js", (r) => r.fulfill({ status: 200, contentType: "text/javascript", body: testConfig }));
  await page.goto(`${base}/apps/${app}/index.html${query}`);
  await page.locator("h1").first().waitFor();
  return { ctx, page, requested };
};
const pro = (page, fn, arg) => page.evaluate(`(async (arg) => { const pro = await import("/shared/pro/src/index.js"); return (${fn})(pro, arg); })(${JSON.stringify(arg ?? null)})`);
const modal = (page) => page.getByTestId("pro-modal");

console.log("Módulo Pro");
await step("las apps gratuitas no cargan nada de shared/pro (no se han tocado)", async () => {
  for (const app of Object.keys(APPS)) {
    const { ctx, page, requested } = await open({ app, withKey: false });
    await page.waitForLoadState("networkidle");
    assert.deepEqual(requested.filter((u) => u.includes("/shared/pro/")), [], app);
    assert.equal(await page.evaluate(() => localStorage.getItem("chispatools.pro.v1")), null);
    await ctx.close();
  }
});
for (const [app, name] of Object.entries(APPS)) {
  await step(`${name}: sin licencia no es Pro y requirePro abre el modal con su mensaje, ancla y precio`, async () => {
    const { ctx, page } = await open({ app });
    assert.equal(await pro(page, "(p, a) => p.initPro(a)", app), false);
    assert.equal(await pro(page, "(p) => p.requirePro({ feature: 'Exportar CSV' })"), false);
    const d = modal(page);
    await d.waitFor();
    assert.equal(await d.getAttribute("data-app"), app);
    await page.getByRole("dialog", { name: `${name} Pro` }).waitFor(); // nombre accesible por aria-labelledby
    const cfg = await pro(page, "(p, a) => ({ c: p.PRO_CONFIG[a], price: p.PRO_PRICE_USD, anchor: p.PRO_ANCHOR_USD })", app);
    const text = (await d.innerText()).replace(/\s+/g, " ");
    assert.ok(text.includes(cfg.c.pitch), "mensaje propio");
    assert.ok(text.includes("«Exportar CSV»"), "nombra la función");
    for (const b of cfg.c.benefits) assert.ok(text.includes(b), b);
    assert.equal(cfg.price, 15);
    assert.equal((await page.getByTestId("pro-price").locator("strong").innerText()).trim(), "USD 15");
    assert.equal((await page.getByTestId("pro-anchor").innerText()).trim(), `USD ${cfg.anchor}`);
    assert.equal(await page.getByTestId("pro-anchor").evaluate((e) => e.tagName), "S");
    assert.match(text, /Pago único\. Sin suscripción/);
    // El modal cabe en un celular: sin desborde horizontal y dentro de la pantalla.
    const box = await d.boundingBox();
    assert.ok(box.x >= 0 && box.x + box.width <= 390 && box.height <= 844, JSON.stringify(box));
    assert.equal(await d.evaluate((e) => e.scrollWidth <= e.clientWidth), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    await page.screenshot({ path: `${OUT}/pro-${app}.png` });
    await ctx.close();
  });
}
await step("enlace de pago: https, pestaña nueva y noopener; sin enlace configurado dice «muy pronto»", async () => {
  const a = await open({ app: "splitflow" });
  await pro(a.page, "(p) => p.openUpgradeProModal('splitflow')");
  const buy = a.page.getByTestId("pro-buy");
  assert.equal(await buy.getAttribute("href"), PAY);
  assert.equal(await buy.getAttribute("target"), "_blank");
  assert.equal(await buy.getAttribute("rel"), "noopener");
  assert.equal(await a.page.getByTestId("pro-soon").count(), 0);
  await a.ctx.close();
  const b = await open({ app: "caja-clara" });
  await pro(b.page, "(p) => p.openUpgradeProModal('caja-clara')");
  await b.page.getByTestId("pro-soon").waitFor();
  assert.equal(await b.page.getByTestId("pro-buy").count(), 0);
  await b.ctx.close();
});
await step("accesible con teclado: foco dentro, Tab no sale, Esc cierra y devuelve el foco", async () => {
  const { ctx, page } = await open({ app: "priceright" });
  await page.evaluate(() => { const b = document.querySelector("main button, #app button, button"); b.id = b.id || "opener-e2e"; b.focus(); });
  const openerId = await page.evaluate(() => document.activeElement.id);
  await pro(page, "(p) => p.openUpgradeProModal('priceright')");
  await modal(page).waitFor();
  assert.equal(await page.evaluate(() => document.querySelector("#pro-modal").matches(":modal")), true);
  for (let i = 0; i < 12; i++) {
    assert.equal(await page.evaluate(() => { const a = document.activeElement; return a === document.body || !!a.closest("#pro-modal"); }), true, `tab ${i}`);
    await page.keyboard.press("Tab");
  }
  assert.equal(await page.getByLabel("¿Ya tienes una licencia? Pégala aquí").count(), 1);
  assert.equal(await page.getByRole("button", { name: "Cerrar" }).count(), 1);
  for (const sel of [".pro-close", ".pro-activate button"]) { const b = await page.locator(sel).boundingBox(); assert.ok(b.height >= 44 && b.width >= 44, `${sel} ${JSON.stringify(b)}`); }
  await page.keyboard.press("Escape");
  await modal(page).waitFor({ state: "detached" });
  assert.equal(await page.evaluate(() => document.activeElement.id), openerId);
  await ctx.close();
});
await step("licencia vacía, rota o de otra app: error claro y sigue sin ser Pro", async () => {
  const { ctx, page } = await open({ app: "splitflow" });
  await pro(page, "(p) => p.initPro('splitflow')");
  await pro(page, "(p) => p.requirePro()");
  const status = page.getByTestId("pro-status"), token = page.getByTestId("pro-token"), go = page.getByRole("button", { name: "Activar licencia" });
  await go.click();
  assert.match(await status.innerText(), /Pega primero tu licencia/);
  assert.equal(await token.getAttribute("aria-invalid"), "true");
  await token.fill("esto no es una licencia"); await go.click();
  await page.waitForFunction(() => /formato correcto/.test(document.querySelector("[data-testid=pro-status]").textContent));
  await token.fill(license["caja-clara"]); await go.click();
  await page.waitForFunction(() => /otra app/.test(document.querySelector("[data-testid=pro-status]").textContent));
  await token.fill(license.splitflow.slice(0, -4) + "AAAA"); await go.click();
  await page.waitForFunction(() => /No pudimos validar/.test(document.querySelector("[data-testid=pro-status]").textContent));
  assert.equal(await status.getAttribute("role"), "status");
  assert.equal(await pro(page, "(p) => p.isPro('splitflow')"), false);
  assert.equal(await page.evaluate(() => localStorage.getItem("chispatools.pro.v1")), null);
  await ctx.close();
});
await step("licencia válida: activa Pro, avisa, se guarda y sobrevive a recargar; no vale para otra app", async () => {
  const { ctx, page } = await open({ app: "splitflow" });
  await pro(page, "(p) => { window.__cambios = []; p.onProChange((a) => window.__cambios.push(a)); return p.initPro('splitflow'); }");
  await pro(page, "(p) => p.requirePro({ onActivated: () => { window.__activada = true; } })");
  await page.getByTestId("pro-token").fill(`  ${license.splitflow.slice(0, 50)}\n${license.splitflow.slice(50)} `); // pegada con salto de línea
  await page.getByRole("button", { name: "Activar licencia" }).click();
  await page.getByTestId("pro-done").waitFor();
  assert.match(await page.getByTestId("pro-status").innerText(), /SplitFlow Pro está activo en este dispositivo/);
  assert.equal(await page.evaluate(() => window.__activada), true);
  assert.deepEqual(await page.evaluate(() => window.__cambios), ["splitflow"]);
  assert.equal(await page.evaluate(() => document.activeElement.getAttribute("data-testid")), "pro-done");
  await page.getByTestId("pro-done").click();
  await modal(page).waitFor({ state: "detached" });
  assert.equal(await pro(page, "(p) => p.requirePro()"), true);
  assert.equal(await modal(page).count(), 0);
  assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem("chispatools.pro.v1"))), { splitflow: license.splitflow });
  await page.reload();
  assert.equal(await pro(page, "(p) => p.isPro('splitflow')"), false); // hasta verificar la firma, no
  assert.equal(await pro(page, "(p) => p.initPro('splitflow')"), true);
  await page.goto(`${base}/apps/caja-clara/index.html`); // mismo origen, otra app
  assert.equal(await pro(page, "(p) => p.initPro('caja-clara')"), false);
  // Datos de la app intactos: la licencia vive en su propia clave.
  assert.equal(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("chispatools.pro")).length), 1);
  await ctx.close();
});
await step("licencia guardada pero manipulada: no da Pro", async () => {
  const { ctx, page } = await open({ app: "splitflow" });
  await page.evaluate((t) => localStorage.setItem("chispatools.pro.v1", JSON.stringify({ splitflow: t })), license["caja-clara"]);
  assert.equal(await pro(page, "(p) => p.initPro('splitflow')"), false);
  await page.evaluate(() => localStorage.setItem("chispatools.pro.v1", "{roto"));
  assert.equal(await pro(page, "(p) => p.initPro('splitflow')"), false);
  await ctx.close();
});
await step("configuración real del repositorio (sin clave pública): una licencia de prueba no activa nada", async () => {
  const { ctx, page } = await open({ app: "splitflow", withKey: false });
  assert.deepEqual(await pro(page, "(p, t) => p.activateLicense('splitflow', t)", license.splitflow), { ok: false, error: "sin-clave" });
  await pro(page, "(p) => p.openUpgradeProModal('splitflow')");
  await page.getByTestId("pro-soon").waitFor(); // tampoco hay enlace de pago configurado
  assert.equal(await page.evaluate(() => localStorage.getItem("chispatools.pro.v1")), null);
  await ctx.close();
});
await step("Google Play (TWA): con ?tienda=play no hay precio ni compra, y se recuerda en la sesión", async () => {
  const { ctx, page } = await open({ app: "splitflow", query: "?tienda=play" });
  assert.equal(await pro(page, "(p) => p.purchaseHidden()"), true);
  await pro(page, "(p) => p.openUpgradeProModal('splitflow', { feature: 'Exportar CSV' })");
  await modal(page).waitFor();
  for (const id of ["pro-price", "pro-anchor", "pro-buy", "pro-soon"]) assert.equal(await page.getByTestId(id).count(), 0, id);
  const text = await modal(page).innerText();
  assert.equal(/USD|Comprar|pago/i.test(text), false, text);
  assert.equal(await modal(page).locator("a").count(), 0);
  await page.getByTestId("pro-token").fill(license.splitflow); // activar una licencia ya comprada sí se puede
  await page.getByRole("button", { name: "Activar licencia" }).click();
  await page.getByTestId("pro-done").waitFor();
  await page.goto(`${base}/apps/caja-clara/index.html`); // navega sin el parámetro
  assert.equal(await pro(page, "(p) => p.purchaseHidden()"), true);
  await ctx.close();
});
await step("Google Play: flag de compilación; en la web normal la compra se ve", async () => {
  const b = await open({ app: "priceright" });
  assert.equal(await pro(b.page, "(p) => p.purchaseHidden()"), false);
  await b.page.evaluate(() => { window.MICROAPPS_CONFIG = { ...(window.MICROAPPS_CONFIG || {}), proHidePurchase: true }; });
  assert.equal(await pro(b.page, "(p) => p.purchaseHidden()"), true);
  await b.ctx.close();
});
await step("modo oscuro: el modal usa los colores de la app", async () => {
  const { ctx, page } = await open({ app: "huella-al-dia", dark: true });
  await pro(page, "(p) => p.openUpgradeProModal('huella-al-dia')");
  await modal(page).waitFor();
  await page.waitForFunction(() => getComputedStyle(document.querySelector("#pro-modal")).borderRadius !== "0px");
  const c = await modal(page).evaluate((e) => ({ bg: getComputedStyle(e).backgroundColor, body: getComputedStyle(document.body).getPropertyValue("--surface").trim() }));
  const [r, g, b] = c.bg.match(/\d+/g).map(Number);
  assert.ok(r + g + b < 300, `fondo oscuro esperado: ${c.bg}`);
  await page.screenshot({ path: `${OUT}/pro-huella-oscuro.png` });
  await ctx.close();
});
await step("consola limpia", async () => { assert.deepEqual(errors, []); });

await browser.close();
server.stop();
if (failures) { console.error(`${failures} fallo(s)`); process.exit(1); }
console.log("TODO OK");
