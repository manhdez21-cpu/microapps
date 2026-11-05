// Funciones puras del SEO de despliegue (probadas en tests/tools.test.mjs).
export const normUrl = (u) => (u ?? "").trim().replace(/\/+$/, "");
export const isUrl = (u) => /^https?:\/\/[^\s/]+(\/[^\s]*)?$/.test(u);
export const esc = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/** Rutas públicas indexables a partir de los .html de dist (relativas, con / inicial). */
export function publicPaths(files) {
  return files.filter((f) => f.endsWith(".html") && !f.startsWith("apps/control-center/")).map((f) => "/" + f.replace(/index\.html$/, "")).sort();
}
export function sitemapXml(base, paths, date) {
  const urls = paths.map((p) => `  <url><loc>${esc(base + p)}</loc><lastmod>${date}</lastmod></url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}
export const robotsTxt = (base) => `User-agent: *\nAllow: /\n${base ? `\nSitemap: ${base}/sitemap.xml\n` : ""}`;
export const adsTxt = (client) => { const m = /^ca-pub-(\d{10,20})$/.exec(client ?? ""); return m ? `google.com, pub-${m[1]}, DIRECT, f08c47fec0942fa0\n` : null; };

/** Etiquetas que se inyectan en <head>. No toca las que ya existen. */
export function headTags(html, url, siteName = "Microapps") {
  const title = /<title>([^<]*)<\/title>/.exec(html)?.[1] ?? siteName;
  const desc = /<meta name="description" content="([^"]*)"/.exec(html)?.[1] ?? "";
  const out = [];
  if (!/rel="canonical"/.test(html)) out.push(`<link rel="canonical" href="${esc(url)}">`);
  if (!/property="og:title"/.test(html)) out.push(
    `<meta property="og:type" content="website">`, `<meta property="og:site_name" content="${siteName}">`, `<meta property="og:locale" content="es_LA">`,
    `<meta property="og:title" content="${title}">`, `<meta property="og:description" content="${desc}">`, `<meta property="og:url" content="${esc(url)}">`,
    `<meta name="twitter:card" content="summary">`);
  return out;
}
export const injectHead = (html, tags) => (tags.length ? html.replace("</head>", "  " + tags.join("\n  ") + "\n</head>") : html);

export function siteConfigJs(env, prev) {
  const c = { adsenseClient: "", adSlot: "", adSlotInline: "", ga4Id: "", googleClientId: "", siteUrl: "", playUrl: "" };
  const map = { adsenseClient: "ADSENSE_CLIENT", adSlot: "ADSENSE_SLOT", adSlotInline: "ADSENSE_SLOT_INLINE", ga4Id: "GA4_ID", googleClientId: "GOOGLE_CLIENT_ID", siteUrl: "SITE_URL", playUrl: "PLAY_URL" };
  for (const [k, e] of Object.entries(map)) c[k] = (env[e] ?? "").trim();
  c.siteUrl = normUrl(c.siteUrl);
  return `// Generado en el despliegue desde variables públicas (no son secretos).\nwindow.MICROAPPS_CONFIG = window.MICROAPPS_CONFIG || ${JSON.stringify(c)};\n`;
}

/** Enlace corto `/<slug>/` que lleva a la app real. El canonical apunta a la ruta real para no duplicar contenido. */
export function redirectStub(slug) {
  const to = `../apps/${slug}/`;
  return `<!doctype html>\n<html lang="es"><head><meta charset="utf-8"><title>Redirigiendo…</title>\n<meta name="robots" content="noindex">\n<link rel="canonical" href="${to}">\n<meta http-equiv="refresh" content="0; url=${to}">\n<script>location.replace(${JSON.stringify(to)} + location.search + location.hash);</script></head>\n<body><p><a href="${to}">Abrir la app</a></p></body></html>\n`;
}
