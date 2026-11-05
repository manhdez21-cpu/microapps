// Trae las cifras reales (GA4 + Search Console) a apps/control-center/data/metrics.json. Variables de entorno, nunca en el repositorio:
//   GA4_PROPERTY_ID                       ID numérico de la propiedad de GA4.
//   GOOGLE_APPLICATION_CREDENTIALS        ruta al JSON de la cuenta de servicio (uso local), o
//   GA_SERVICE_ACCOUNT_JSON               el contenido del JSON (uso en GitHub Actions, como secreto).
//   SEARCH_CONSOLE_SITE (opcional)        por defecto sc-domain:chispatools.com
// Sin credenciales no escribe nada y termina bien (el panel muestra «Sin datos»).
import { readFileSync, writeFileSync } from "node:fs";
import { fetchMetrics } from "./lib/ga4.mjs";
const id = (process.env.GA4_PROPERTY_ID ?? "").trim();
const path = process.env.GOOGLE_APPLICATION_CREDENTIALS, inline = process.env.GA_SERVICE_ACCOUNT_JSON;
if (!/^\d{5,15}$/.test(id) || (!path && !inline)) { console.log("Pendiente de credenciales: define GA4_PROPERTY_ID y GOOGLE_APPLICATION_CREDENTIALS (o GA_SERVICE_ACCOUNT_JSON). No se escribió nada."); process.exit(0); }
let sa;
try { sa = JSON.parse(inline ?? readFileSync(path, "utf8")); } catch { console.error("La cuenta de servicio no es un JSON válido."); process.exit(1); }
if (!sa.client_email || !sa.private_key) { console.error("Al JSON de la cuenta de servicio le faltan client_email o private_key."); process.exit(1); }
const out = new URL("../apps/control-center/data/metrics.json", import.meta.url);
const sites = process.env.SEARCH_CONSOLE_SITE ? [process.env.SEARCH_CONSOLE_SITE] : ["sc-domain:chispatools.com", "https://chispatools.com/", "https://www.chispatools.com/"];
let data;
for (const site of sites) { data = await fetchMetrics(sa, id, fetch, new Date(), site); if (data.search) break; }
writeFileSync(out, JSON.stringify(data, null, 2) + "\n");
console.log(`metrics.json: ${data.overall.views} vistas y ${data.overall.users} usuarios (${data.range}). Search Console: ${data.search ? "ok" : `no disponible (${data.searchError})`}.`);
