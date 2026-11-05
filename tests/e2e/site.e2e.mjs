import assert from "node:assert/strict";
import { launch, startServer } from "./helpers.mjs";
const server = await startServer(new URL("../../dist", import.meta.url).pathname, 8134);
const browser = await launch();
let failures = 0;
const step = async (name, fn) => { try { await fn(); console.log("  ok  ", name); } catch (e) { failures++; console.log("  FAIL", name, "\n      ", e.message.split("\n")[0]); } };
const base = "http://127.0.0.1:8134";
const CFG = { adsenseClient: "ca-pub-1234567890123456", adSlot: "1234567890", ga4Id: "G-TEST123456", adDelayMs: 0 };
const newPage = async (cfg) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const requests = [], errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.route("https://pagead2.googlesyndication.com/**", (r) => { requests.push(r.request().url()); r.fulfill({ status: 200, contentType: "text/javascript", body: "" }); });
  await page.route("https://www.googletagmanager.com/**", (r) => { requests.push(r.request().url()); r.fulfill({ status: 200, contentType: "text/javascript", body: "window.dataLayer=window.dataLayer||[];window.__gtagLoaded=true;" }); });
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
await step("aceptar: carga anuncios y estadísticas, sin enlaces a Premium", async () => {
  const { page, requests, errors } = await newPage(CFG);
  await page.goto(`${base}/apps/warranty-keeper/index.html`);
  await page.getByRole("button", { name: "Aceptar", exact: true }).click();
  await page.waitForSelector('[data-testid="ad-box"]');
  assert.equal(requests.filter((r) => /googlesyndication/.test(r)).length, 1);
  assert.match(requests.find((r) => /googlesyndication/.test(r)), /client=ca-pub-1234567890123456/);
  assert.equal(requests.filter((r) => /googletagmanager.*G-TEST123456/.test(r)).length, 1);
  assert.equal(/Premium/i.test(await page.locator("body").innerText()), false);
  await page.reload();
  assert.equal(await page.getByTestId("ad-box").count() >= 1, true);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  assert.deepEqual(errors.filter((e) => !/adsbygoogle|TagError/i.test(e)), []);
});
await step("anuncios: dos en la web (bajo la herramienta y al final del texto), uno en la app instalada, nunca fijos", async () => {
  const { page } = await newPage(CFG);
  await page.goto(`${base}/apps/priceright/index.html`);
  await page.getByRole("button", { name: "Aceptar", exact: true }).click();
  await page.waitForSelector('[data-testid="ad-box"]');
  const slots = await page.$$eval("[data-testid=ad-box]", (a) => a.map((x) => x.getAttribute("data-slot")));
  assert.deepEqual(slots.sort(), ["end", "tool"]);
  assert.equal(await page.$$eval("[data-testid=ad-box]", (a) => a.every((x) => getComputedStyle(x).position === "static")), true);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p2 = await ctx.newPage();
  await p2.addInitScript((c) => { window.MICROAPPS_CONFIG = c; localStorage.setItem("microapps.adconsent.v1", "granted"); const mm = window.matchMedia.bind(window); window.matchMedia = (q) => /standalone/.test(q) ? { matches: true, media: q, addEventListener() {}, removeEventListener() {} } : mm(q); }, CFG);
  await p2.route("https://**/*", (r) => r.fulfill({ status: 200, contentType: "text/javascript", body: "" }));
  await p2.goto(`${base}/apps/priceright/index.html`);
  await p2.waitForSelector('[data-testid="ad-box"]');
  assert.equal(await p2.getByTestId("ad-box").count(), 1);
});
await step("los anuncios esperan: sin interacción no aparecen antes del retraso", async () => {
  const { page } = await newPage({ ...CFG, adDelayMs: 60000 });
  await page.goto(`${base}/apps/caja-clara/index.html`);
  await page.getByRole("button", { name: "Aceptar", exact: true }).click();
  assert.equal(await page.getByTestId("ad-box").count(), 0);
  await page.locator("input").first().click();
  await page.waitForSelector('[data-testid="ad-box"]');
});
await step("estadísticas: solo cuentan eventos con consentimiento y no envían texto escrito", async () => {
  const { page } = await newPage(CFG);
  await page.addInitScript(() => { window.__ev = []; Object.defineProperty(window, "gtag", { configurable: true, set() {}, get() { return function () { window.__ev.push([...arguments]); }; } }); });
  await page.goto(`${base}/apps/splitflow/index.html`);
  assert.equal(await page.evaluate(() => window.__ev.length), 0);
  await page.getByRole("button", { name: "Aceptar", exact: true }).click();
  await page.getByLabel("Nombre del grupo").fill("Secreto familiar");
  const ev = await page.evaluate(() => window.__ev);
  const names = ev.filter((e) => e[0] === "event").map((e) => e[1]);
  assert.equal(names.includes("app_open") && names.includes("first_use"), true);
  assert.equal(JSON.stringify(ev).includes("Secreto"), false);
  assert.equal(ev.find((e) => e[1] === "app_open")[2].app, "splitflow");
});
await step("cambiar preferencias vuelve a preguntar", async () => {
  const { page } = await newPage(CFG);
  await page.goto(`${base}/apps/expiryhub/index.html`);
  await page.getByRole("button", { name: "No, gracias" }).click();
  await page.getByTestId("consent-manage").click();
  await page.waitForSelector('[data-testid="consent"]');
});
await step("cada app sugiere una sola app relacionada (solo en la web) y permite compartir", async () => {
  const { page } = await newPage();
  await page.goto(`${base}/apps/huella-al-dia/index.html`);
  const hrefs = await page.$$eval("[data-testid=more-tools] a", (a) => a.map((x) => x.getAttribute("href")));
  assert.deepEqual(hrefs, ["../expiryhub/index.html"]);
  for (const h of hrefs) assert.equal((await page.request.get(`${base}/apps/huella-al-dia/${h}`)).status(), 200, h);
  await page.evaluate(() => { window.__opened = null; window.open = (u) => { window.__opened = u; return null; }; });
  await page.getByTestId("share-app").click();
  assert.match(await page.evaluate(() => window.__opened), /^https:\/\/wa\.me\/\?text=.*huella-al-dia/);
});
await step("sugerencias por WhatsApp (si hay número), y enlaces a privacidad y términos", async () => {
  const c = await browser.newContext(); await c.addInitScript(() => { window.MICROAPPS_CONFIG = { adsenseClient: "", adSlot: "", adSlotInline: "", ga4Id: "", googleClientId: "", contactWhatsapp: "573001112233", contactEmail: "", siteUrl: "", playUrl: "" }; });
  const page = await c.newPage(); await page.goto(`${base}/apps/priceright/index.html`);
  const href = await page.getByTestId("feedback").getAttribute("href");
  assert.match(href, /^https:\/\/wa\.me\/573001112233\?text=.*PriceRight/);
  const links = await page.$$eval("[data-testid=legal-links] a", (a) => a.map((x) => x.getAttribute("href")));
  assert.equal(links.length, 2);
  assert.equal((await page.request.get(`${base}/terminos.html`)).status(), 200);
  assert.equal((await page.request.get(`${base}/privacidad.html`)).status(), 200);
  const p2 = await (await browser.newContext()).newPage(); await p2.goto(`${base}/apps/priceright/index.html`);
  assert.equal(await p2.getByTestId("feedback").count(), 0, "sin contacto configurado no hay botón");
  await c.close();
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
await step("enlaces cortos /<app>/ llevan a cada app", async () => {
  const { page } = await newPage();
  for (const a of ["splitflow", "caja-clara", "priceright", "cuanto-me-sobra", "expiryhub", "warranty-keeper", "huella-al-dia"]) {
    await page.goto(`${base}/${a}/`);
    await page.waitForURL(new RegExp(`/apps/${a}/`));
    assert.equal(await page.locator("h1").count() >= 1, true, a);
  }
});
await step("política de privacidad accesible", async () => {
  const { page } = await newPage();
  const r = await page.goto(`${base}/privacidad.html`);
  assert.equal(r.status(), 200);
});
await browser.close(); server.stop();
console.log(failures ? `${failures} FALLOS` : "TODO OK");
process.exit(failures ? 1 : 0);
