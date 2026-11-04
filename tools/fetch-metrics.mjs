// Trae las cifras reales de GA4 a apps/control-center/data/metrics.json. Requiere (variables de entorno, nunca en el repo):
//   GA4_PROPERTY_ID  y  GOOGLE_APPLICATION_CREDENTIALS (ruta al JSON de una cuenta de servicio con rol «Lector» en esa propiedad).
import { readFileSync, writeFileSync } from "node:fs";
import { fetchMetrics } from "./lib/ga4.mjs";
const id = process.env.GA4_PROPERTY_ID, cred = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!id || !cred) { console.log("Pendiente de credenciales: define GA4_PROPERTY_ID y GOOGLE_APPLICATION_CREDENTIALS. No se escribió nada."); process.exit(0); }
const out = new URL("../apps/control-center/data/metrics.json", import.meta.url);
const data = await fetchMetrics(JSON.parse(readFileSync(cred, "utf8")), id);
writeFileSync(out, JSON.stringify(data, null, 2) + "\n");
console.log(`metrics.json: ${data.overall.views} vistas y ${data.overall.users} usuarios (${data.range}).`);
