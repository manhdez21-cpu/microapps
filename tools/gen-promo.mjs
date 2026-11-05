// Material de promoción: imagen vertical para estados (1080×1920) y PDF de una página por app.
// Usa las capturas con datos de ejemplo de docs/play/<app>/. Uso: node tools/gen-promo.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const BASE = process.env.SITE_URL || "https://chispatools.com";
const APPS = [
  { id: "splitflow", name: "SplitFlow", sub: "Dividir Cuentas", color: "#3a3fc4", tag: "Divide gastos y ve quién paga a quién", who: "Viajes, casa compartida, salidas con amigos" },
  { id: "caja-clara", name: "Caja Clara", sub: "Cierre de caja", color: "#8a4a0f", tag: "Cierra la caja del día sin sufrir", who: "Tiendas, puestos y negocios pequeños" },
  { id: "priceright", name: "PriceRight", sub: "Precio Justo", color: "#15694a", tag: "Pon precio a tu trabajo sin regalarlo", who: "Independientes, oficios y emprendedores" },
  { id: "cuanto-me-sobra", name: "¿Cuánto me sobra?", sub: "Cerámica y pintura", color: "#1f5fa8", tag: "Cuánta cerámica o pintura comprar", who: "Remodelaciones y arreglos en casa" },
  { id: "expiryhub", name: "ExpiryHub", sub: "Vencimientos", color: "#1e3a8a", tag: "SOAT, seguros y licencias a tiempo", who: "Conductores, familias y negocios" },
  { id: "warranty-keeper", name: "Warranty Keeper", sub: "Garantías", color: "#1d3f9c", tag: "Garantías con factura y fecha de fin", who: "Quien compra electrodomésticos y tecnología" },
  { id: "huella-al-dia", name: "Huella al Día", sub: "Mascotas", color: "#0f766e", tag: "El carnet de tu mascota en el celular", who: "Dueños de perros y gatos" },
];
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const img = (p) => `data:image/png;base64,${readFileSync(p).toString("base64")}`;
const bullets = (id) => readFileSync(`docs/play/${id}/ficha.md`, "utf8").split("\n").filter((l) => l.startsWith("•")).map((l) => l.slice(1).trim());
const font = "font-family: 'DejaVu Sans', Arial, sans-serif;";
const link = (a) => `${BASE.replace(/^https?:\/\//, "")}/${a.id}`;

const estadoHtml = (a) => `<html><body style="margin:0;width:1080px;height:1920px;background:${a.color};${font};color:#fff;position:relative;overflow:hidden">
<div style="position:absolute;right:-180px;top:-120px;width:620px;height:620px;border-radius:50%;background:#fff;opacity:.07"></div>
<div style="padding:90px 80px 0"><div style="font-size:30px;opacity:.8;letter-spacing:2px">GRATIS · SIN REGISTRO</div>
<div style="font-size:${a.name.length > 14 ? 82 : 104}px;font-weight:700;margin-top:22px;line-height:1.05">${esc(a.name)}</div>
<div style="font-size:40px;opacity:.9;margin-top:10px">${esc(a.sub)}</div>
<div style="font-size:46px;margin-top:44px;line-height:1.25;max-width:900px">${esc(a.tag)}</div></div>
<div style="position:absolute;left:210px;top:560px;width:660px;height:1100px;border-radius:64px;background:#111;padding:14px;box-shadow:0 30px 80px rgba(0,0,0,.35)">
<div style="width:100%;height:100%;border-radius:52px;overflow:hidden;background:#fff"><img src="${img(`docs/play/${a.id}/captura-4.png`)}" style="width:100%;display:block"></div></div>
<div style="position:absolute;left:0;right:0;bottom:0;height:200px;background:rgba(0,0,0,.22);display:flex;flex-direction:column;align-items:center;justify-content:center">
<div style="font-size:30px;opacity:.85">Pruébala en tu celular, sin instalar nada</div>
<div style="font-size:48px;font-weight:700;margin-top:10px">${esc(link(a))}</div></div></body></html>`;

const pdfHtml = (a) => `<html><body style="margin:0;${font};color:#1c1c1c;background:#fff;width:1200px">
<div style="background:${a.color};color:#fff;padding:70px 70px 54px"><div style="font-size:24px;opacity:.8;letter-spacing:2px">GRATIS · SIN REGISTRO · TUS DATOS EN TU CELULAR</div>
<div style="font-size:84px;font-weight:700;margin-top:16px;line-height:1.05">${esc(a.name)} <span style="font-weight:400;font-size:44px;opacity:.9">· ${esc(a.sub)}</span></div>
<div style="font-size:40px;margin-top:18px">${esc(a.tag)}</div></div>
<div style="display:flex;gap:30px;padding:56px 70px 20px">${[2, 3, 4].map((n) => `<div style="flex:1;border-radius:34px;background:#111;padding:8px"><div style="border-radius:28px;overflow:hidden;aspect-ratio:1080/1700"><img src="${img(`docs/play/${a.id}/captura-${n}.png`)}" style="width:100%;display:block"></div></div>`).join("")}</div>
<div style="padding:30px 70px 0"><div style="font-size:34px;font-weight:700;color:${a.color}">Qué hace</div>
<ul style="font-size:29px;line-height:1.5;padding-left:36px;margin:14px 0 0">${bullets(a.id).map((b) => `<li>${esc(b)}</li>`).join("")}</ul>
<div style="font-size:27px;margin-top:26px;color:#555">Ideal para: ${esc(a.who)}.</div></div>
<div style="margin:44px 70px 60px;padding:34px;border-radius:26px;background:${a.color};color:#fff;text-align:center"><div style="font-size:28px;opacity:.9">Ábrela ahora en tu celular, sin instalar nada</div>
<div style="font-size:54px;font-weight:700;margin-top:8px">${esc(link(a))}</div></div></body></html>`;

mkdirSync("docs/promo", { recursive: true });
const browser = await chromium.launch();
for (const a of APPS) {
  if (!existsSync(`docs/play/${a.id}/captura-4.png`)) throw new Error(`faltan capturas de ${a.id}: ejecuta tools/gen-store-kit.mjs`);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.setContent(estadoHtml(a)); await page.screenshot({ path: `docs/promo/${a.id}-estado.png` });
  await page.setViewportSize({ width: 1200, height: 1800 });
  await page.setContent(pdfHtml(a));
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.pdf({ path: `docs/promo/${a.id}.pdf`, width: "1200px", height: `${h}px`, printBackground: true, pageRanges: "1" });
  await ctx.close();
}
await browser.close();
console.log("promo ok →", APPS.length, "imágenes y PDFs en docs/promo/");
