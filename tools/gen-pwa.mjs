// Genera iconos, manifest y service worker de cada app y los enlaza en su index.html. Idempotente.
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
const require = createRequire(import.meta.url);
const sharp = require(process.env.SHARP_PATH ?? "/home/claude/.npm-global/lib/node_modules/sharp");
const root = new URL("..", import.meta.url).pathname;
const SHAPES = {
  paw: '<g fill="#fff"><ellipse cx="256" cy="330" rx="86" ry="70"/><ellipse cx="148" cy="236" rx="36" ry="50" transform="rotate(-20 148 236)"/><ellipse cx="226" cy="168" rx="36" ry="52"/><ellipse cx="300" cy="168" rx="36" ry="52"/><ellipse cx="372" cy="236" rx="36" ry="50" transform="rotate(20 372 236)"/></g>',
  tick: '<g fill="none" stroke="#fff" stroke-width="44" stroke-linecap="round" stroke-linejoin="round"><path d="M132 270l86 86 164-196"/><rect x="92" y="92" width="328" height="328" rx="48" stroke-width="22" opacity=".5"/></g>',
};
const APPS = [
  { id: "caja-clara", name: "Caja Clara", short: "Caja Clara", glyph: "C", color: "#8a4b00", bg: "#efe9da", desc: "Cierre de caja diario para tu negocio." },
  { id: "priceright", name: "PriceRight", short: "PriceRight", glyph: "$", color: "#1b6b45", bg: "#efe6d3", desc: "Calcula el precio de tu trabajo con margen real." },
  { id: "cuanto-me-sobra", name: "¿Cuánto me sobra?", short: "¿Cuánto me sobra?", glyph: "m²", color: "#0b5fa5", bg: "#eaf1f8", desc: "Cerámica y pintura: cuánto comprar." },
  { id: "expiryhub", name: "ExpiryHub", short: "ExpiryHub", glyph: "31", color: "#1f3a6e", bg: "#edf0f5", desc: "Vencimientos de SOAT, seguros, licencias y contratos." },
  { id: "warranty-keeper", name: "Warranty Keeper", short: "Garantías", glyph: "tick", color: "#1b3d8f", bg: "#e9e6dd", desc: "Garantías de tus compras con factura." },
  { id: "huella-al-dia", name: "Huella al Día", short: "Huella", glyph: "paw", color: "#0f766e", bg: "#eef7f5", desc: "Carnet de salud de tu perro o gato." },
];
const sw = (id) => readFileSync(join(root, "apps/splitflow/sw.js"), "utf8").replace('"splitflow-v1"', '"' + id + '-v1"');
for (const a of APPS) {
  const dir = join(root, "apps", a.id);
  const size = a.glyph.length > 2 ? 150 : a.glyph.length === 2 ? 190 : 280;
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="96" fill="' + a.color + '"/>' + (SHAPES[a.glyph] ?? ('<text x="256" y="' + (256 + size * 0.35) + '" text-anchor="middle" font-family="Georgia, serif" font-weight="700" font-size="' + size + '" fill="#fff">' + a.glyph + "</text>")) + "</svg>";
  writeFileSync(join(dir, "icon.svg"), svg);
  for (const px of [192, 512]) await sharp(Buffer.from(svg)).resize(px, px).png().toFile(join(dir, "icon-" + px + ".png"));
  writeFileSync(join(dir, "manifest.webmanifest"), JSON.stringify({ name: a.name, short_name: a.short, description: a.desc, start_url: "./", scope: "./", display: "standalone", background_color: a.bg, theme_color: a.color, lang: "es", icons: [{ src: "icon-192.png", sizes: "192x192", type: "image/png" }, { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" }] }, null, 2) + "\n");
  writeFileSync(join(dir, "sw.js"), sw(a.id));
  const f = join(dir, "index.html");
  let html = readFileSync(f, "utf8");
  if (!html.includes("manifest.webmanifest")) html = html.replace('<link rel="stylesheet" href="../../packages/ui/src/base.css">', '<link rel="manifest" href="./manifest.webmanifest">\n  <link rel="icon" href="./icon.svg" type="image/svg+xml">\n  <link rel="apple-touch-icon" href="./icon-192.png">\n  <link rel="stylesheet" href="../../packages/ui/src/base.css">');
  if (!html.includes("pwa.js")) html = html.replace("</body>", '  <script type="module" src="../../packages/ui/src/pwa.js"></script>\n</body>');
  writeFileSync(f, html);
}
console.log("PWA generada para", APPS.length, "apps");
