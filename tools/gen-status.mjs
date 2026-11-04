// Ejecuta todas las pruebas del repo y escribe apps/control-center/data/status.json (datos REALES de pruebas).
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const suites = [];
for (const base of ["packages", "apps"]) {
  for (const name of readdirSync(join(root, base))) {
    const dir = join(root, base, name, "test");
    if (!existsSync(dir)) continue;
    const files = readdirSync(dir).filter((f) => f.endsWith(".test.ts")).map((f) => join(dir, f));
    if (files.length === 0) continue;
    let out = "";
    try { out = execFileSync("node", ["--test", ...files], { encoding: "utf8" }); }
    catch (e) { out = String(e.stdout ?? ""); }
    const n = (k) => Number(new RegExp(`^# ${k} (\\d+)`, "m").exec(out)?.[1] ?? NaN);
    suites.push({ name: `${base}/${name}`, tests: n("tests"), pass: n("pass"), fail: n("fail") });
  }
}
const registry = JSON.parse(readFileSync(join(root, "apps/control-center/data/registry.json"), "utf8"));

// Métricas REALES por aplicación (medidas en el repositorio; nada de usuarios ni ingresos).
const read = (f) => (existsSync(f) ? readFileSync(f, "utf8") : "");
const countSteps = (text) => (text.match(/await step\(/g) ?? []).length;
const e2e = (f) => read(join(root, "tests/e2e", f));
const split = (text, marker) => { const i = text.indexOf(marker); return [text.slice(0, i), text.slice(i)]; };
const [prText, cuText] = split(e2e("calculators.e2e.mjs"), 'console.log("¿Cuánto me sobra?")');
const [exText, waText] = split(e2e("trackers.e2e.mjs"), 'console.log("Warranty Keeper")');
const e2eSteps = { splitflow: countSteps(e2e("splitflow.e2e.mjs")), "caja-clara": countSteps(e2e("caja-clara.e2e.mjs")), priceright: countSteps(prText), "cuanto-me-sobra": countSteps(cuText), expiryhub: countSteps(exText), "warranty-keeper": countSteps(waText), "huella-al-dia": countSteps(e2e("huella.e2e.mjs")) };
const lines = (f) => read(f).split("\n").length;
const dirKb = (d) => { if (!existsSync(d)) return null; let n = 0; for (const e of readdirSync(d, { withFileTypes: true })) { const p = join(d, e.name); n += e.isDirectory() ? (dirKb(p) ?? 0) * 1024 : statSync(p).size; } return Math.round((n / 1024) * 10) / 10; };
const perApp = {};
for (const a of registry.apps) {
  const dir = join(root, "apps", a.id);
  const html = read(join(dir, "index.html"));
  const src = existsSync(join(dir, "src")) ? readdirSync(join(dir, "src")).filter((f) => f.endsWith(".ts")) : [];
  const unit = suites.find((x) => x.name === `apps/${a.id}`);
  perApp[a.id] = {
    unitTests: unit ? { tests: unit.tests, pass: unit.pass } : null,
    e2eSteps: e2eSteps[a.id] ?? 0,
    sourceLines: src.reduce((n, f) => n + lines(join(dir, "src", f)), 0) + lines(join(dir, "index.html")) + lines(join(dir, "styles.css")),
    buildKb: dirKb(join(root, "dist/apps", a.id)),
    seo: { title: (/<title>(.*?)<\/title>/s.exec(html)?.[1] ?? "").length, description: (/name="description" content="(.*?)"/s.exec(html)?.[1] ?? "").length, jsonLd: (html.match(/application\/ld\+json/g) ?? []).length, faq: html.includes("FAQPage") },
    pwa: { manifest: existsSync(join(dir, "manifest.webmanifest")), serviceWorker: existsSync(join(dir, "sw.js")) },
    adsReady: html.includes("monetize.js"),
  };
}
const status = { generatedAt: new Date().toISOString(), tests: suites, registry, perApp };
writeFileSync(join(root, "apps/control-center/data/status.json"), JSON.stringify(status, null, 2));
const total = suites.reduce((a, s) => a + s.tests, 0), pass = suites.reduce((a, s) => a + s.pass, 0);
console.log(`status.json: ${pass}/${total} pruebas pasan en ${suites.length} paquetes`);
