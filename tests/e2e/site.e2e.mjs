import assert from "node:assert/strict";
import { launch, startServer } from "./helpers.mjs";
const server = await startServer(new URL("../../dist", import.meta.url).pathname, 8134);
const browser = await launch();
let failures = 0;
const step = async (name, fn) => { try { await fn(); console.log("  ok  ", name); } catch (e) { failures++; console.log("  FAIL", name, "\n      ", e.message.split("\n")[0]); } };
const base = "http://127.0.0.1:8134";
const CFG = { adsenseClient: "ca-pub-1234567890123456", adSlot: "1234567890", premiumUrl: "https://example.invalid/premium" };
const newPage = async (cfg) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const requests = [], errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.route("https://pagead2.googlesyndication.com/**", (r) => { requests.push(r.request().url()); r.fulfill({ status: 200, contentType: "text/javascript", body: "" }); });
  if (cfg) await page.addInitScript((c) => { window.MICROAPPS_CONFIG = c; }, cfg);
  return { page, requests, errors };
};
console.log("Sitio y monetización");
await step("portada enlaza las 7 apps y todas cargan sin errores", async () => {
  const { page, errors } = await newPage();
  await page.goto(`${base}/index.html`);
  const hrefs = await page.$$eval(".apps a", (a) => a.map((x) => x.getAttribute("href")));
  assert.equal(hrefs.length, 7);
  for (const h of hrefs) { const r = await page.goto(`${base}/${h.replace("./", "")}`); assert.equal(r.status(), 200, h); assert.equal(await page.locator("h1").count() >= 1, true, h); }
  assert.deepEqual(errors, []);
});
await step("sin configuración no hay banner, anuncios ni peticiones a Google", async () => {
  const { page, requests } = await newPage();
  await page.goto(`${base}/apps/caja-clara/index.html`);
  assert.equal(await page.getByTestId("consent").count(), 0);
  assert.equal(await page.getByTestId("ad-box").count(), 0);
  assert.equal(requests.length, 0);
});
await step("con configuración pregunta antes de cargar nada", async () => {
  const { page, requests } = await newPage(CFG);
  await page.goto(`${base}/apps/expiryhub/index.html`);
  assert.equal(await page.getByTestId("consent").count(), 1);
  assert.equal(requests.length, 0);
});
await step("rechazar: sin anuncios y no vuelve a preguntar", async () => {
  const { page, requests } = await newPage(CFG);
  await page.goto(`${base}/apps/expiryhub/index.html`);
  await page.getByRole("button", { name: "No, gracias" }).click();
  await page.reload();
  assert.equal(await page.getByTestId("consent").count(), 0);
  assert.equal(await page.getByTestId("ad-box").count(), 0);
  assert.equal(requests.length, 0);
});
await step("aceptar: carga el script con el cliente y muestra el bloque y el enlace Premium", async () => {
  const { page, requests, errors } = await newPage(CFG);
  await page.goto(`${base}/apps/warranty-keeper/index.html`);
  await page.getByRole("button", { name: "Aceptar anuncios" }).click();
  await page.waitForSelector('[data-testid="ad-box"]');
  assert.equal(requests.length, 1);
  assert.match(requests[0], /client=ca-pub-1234567890123456/);
  assert.match(await page.getByTestId("ad-box").innerText(), /Premium/);
  await page.reload();
  assert.equal(await page.getByTestId("ad-box").count(), 1);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  assert.deepEqual(errors.filter((e) => !/adsbygoogle|TagError/i.test(e)), []);
});
await step("las 7 apps son instalables: manifest, iconos y service worker", async () => {
  const { page } = await newPage();
  for (const app of ["splitflow", "caja-clara", "priceright", "cuanto-me-sobra", "expiryhub", "warranty-keeper", "huella-al-dia"]) {
    await page.goto(`${base}/apps/${app}/index.html`);
    const m = await (await page.request.get(`${base}/apps/${app}/manifest.webmanifest`)).json();
    assert.ok(m.name && m.start_url && m.icons.length >= 2, app);
    for (const i of m.icons) assert.equal((await page.request.get(`${base}/apps/${app}/${i.src}`)).status(), 200, `${app} ${i.src}`);
    await page.waitForFunction(() => navigator.serviceWorker.getRegistration().then((r) => !!r), null, { timeout: 5000 });
  }
});
await step("iPhone: el botón abre los pasos de Compartir → Añadir a pantalla de inicio", async () => {
  const ctx = await browser.newContext({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1", viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  for (const app of ["splitflow", "caja-clara"]) {
    await page.goto(`${base}/apps/${app}/index.html`);
    await page.getByTestId("install-link").click();
    assert.match(await page.getByTestId("ios-install").innerText(), /Compartir[\s\S]*Añadir a pantalla de inicio/);
  }
});
await step("Android: usa el aviso nativo de instalación", async () => {
  const ctx = await browser.newContext({ userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36", viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(`${base}/apps/expiryhub/index.html`);
  await page.evaluate(() => { const e = new Event("beforeinstallprompt"); e.prompt = () => { window.__prompted = true; return Promise.resolve(); }; e.userChoice = Promise.resolve({ outcome: "accepted" }); window.dispatchEvent(e); });
  await page.getByTestId("install-link").click();
  assert.equal(await page.evaluate(() => window.__prompted), true);
});
await step("escritorio sin soporte: no aparece el botón; /instalar.html carga y muestra Play solo si hay URL", async () => {
  const { page } = await newPage();
  await page.goto(`${base}/apps/expiryhub/index.html`);
  assert.equal(await page.getByTestId("install-link").count(), 0);
  await page.goto(`${base}/instalar.html`);
  assert.equal(await page.getByTestId("play-link").isVisible(), false);
  const p2 = (await newPage({ playUrl: "https://play.google.com/store/apps/details?id=x" })).page;
  await p2.goto(`${base}/instalar.html`);
  assert.equal(await p2.getByTestId("play-link").isVisible(), true);
});
await step("política de privacidad accesible", async () => {
  const { page } = await newPage();
  const r = await page.goto(`${base}/privacidad.html`);
  assert.equal(r.status(), 200);
});
await browser.close(); server.stop();
console.log(failures ? `${failures} FALLOS` : "TODO OK");
process.exit(failures ? 1 : 0);
