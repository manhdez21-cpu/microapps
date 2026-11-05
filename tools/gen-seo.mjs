// Post-proceso de dist/: sitemap, robots, ads.txt, canonical/Open Graph y site-config.js según variables de entorno.
// Variables (todas públicas, ninguna es secreto): SITE_URL, ADSENSE_CLIENT, ADSENSE_SLOT, ADSENSE_SLOT_INLINE, GA4_ID, PLAY_URL.
import { mkdirSync, readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { redirectStub, adsTxt, headTags, injectHead, isUrl, normUrl, publicPaths, robotsTxt, siteConfigJs, sitemapXml } from "./lib/seo.mjs";

const dist = join(new URL("..", import.meta.url).pathname, "dist");
const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
const files = walk(dist).map((f) => relative(dist, f));
const base = normUrl(process.env.SITE_URL);
// Enlaces cortos /<app>/ (antes del sitemap, para que no entren en él).
const slugs = files.filter((f) => /^apps\/[a-z0-9-]+\/index\.html$/.test(f)).map((f) => f.split("/")[1]).filter((n) => n !== "control-center");
for (const slug of slugs) { mkdirSync(join(dist, slug), { recursive: true }); writeFileSync(join(dist, slug, "index.html"), redirectStub(slug)); }
const notes = [];
// Verificación de AdSense por meta (no rastrea, y no depende del consentimiento): se añade a todas las páginas públicas si hay ID.
const adClient = /^ca-pub-\d{10,20}$/.test(process.env.ADSENSE_CLIENT ?? "") ? process.env.ADSENSE_CLIENT : null;
if (adClient) for (const f of files.filter((f) => f.endsWith(".html") && !f.startsWith("apps/control-center/"))) {
  const file = join(dist, f); const html = readFileSync(file, "utf8");
  if (!html.includes("google-adsense-account")) writeFileSync(file, html.replace("</head>", `  <meta name="google-adsense-account" content="${adClient}">\n</head>`));
}

if (Object.keys(process.env).some((k) => /^(SITE_URL|ADSENSE_|GA4_ID|PLAY_URL)/.test(k))) writeFileSync(join(dist, "site-config.js"), siteConfigJs(process.env));
if (base && isUrl(base)) {
  const paths = publicPaths(files); // `files` se leyó antes de crear los enlaces cortos: no entran al sitemap
  for (const p of paths) {
    const file = join(dist, p.endsWith("/") ? p + "index.html" : p);
    const html = readFileSync(file, "utf8");
    writeFileSync(file, injectHead(html, headTags(html, base + p)));
  }
  writeFileSync(join(dist, "sitemap.xml"), sitemapXml(base, paths, new Date().toISOString().slice(0, 10)));
  notes.push(`sitemap con ${paths.length} páginas`);
} else notes.push(base ? `SITE_URL inválida (${base}): sin sitemap ni canonical` : "sin SITE_URL: sin sitemap ni canonical (el sitemap exige URLs absolutas)");
writeFileSync(join(dist, "robots.txt"), robotsTxt(base && isUrl(base) ? base : ""));
const ads = adsTxt(process.env.ADSENSE_CLIENT);
if (ads) { writeFileSync(join(dist, "ads.txt"), ads); notes.push("ads.txt"); }
console.log("seo:", notes.join(", "));
