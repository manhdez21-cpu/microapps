// Cliente mínimo de la API de datos de GA4 con cuenta de servicio (solo node:crypto, sin dependencias).
import { createSign } from "node:crypto";
export const APP_SLUGS = ["splitflow", "caja-clara", "priceright", "cuanto-me-sobra", "expiryhub", "warranty-keeper", "huella-al-dia"];
const b64 = (x) => Buffer.from(x).toString("base64url");
export function signJwt(sa, now = Math.floor(Date.now() / 1000)) {
  const head = b64(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const body = b64(JSON.stringify({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/analytics.readonly", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }));
  const sig = createSign("RSA-SHA256").update(`${head}.${body}`).sign(sa.private_key, "base64url");
  return `${head}.${body}.${sig}`;
}
export async function accessToken(sa, fetchFn = fetch) {
  const r = await fetchFn("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: signJwt(sa) }) });
  if (!r.ok) throw new Error(`token ${r.status}`);
  return (await r.json()).access_token;
}
export const reportBody = (slug) => ({
  dateRanges: [{ startDate: "28daysAgo", endDate: "today" }],
  metrics: ["screenPageViews", "activeUsers", "newUsers", "totalAdRevenue"].map((name) => ({ name })),
  ...(slug ? { dimensionFilter: { filter: { fieldName: "pagePath", stringFilter: { matchType: "CONTAINS", value: `/apps/${slug}/` } } } } : {}),
});
/** Convierte la respuesta de runReport (una fila de totales) en números; sin filas = 0 reales. */
export function parseRow(resp) {
  const v = resp?.rows?.[0]?.metricValues?.map((m) => Number(m.value)) ?? [0, 0, 0, 0];
  const [views, users, newUsers, adRevenue] = v;
  return { views, users, newUsers, returningUsers: Math.max(0, users - newUsers), adRevenue: Math.round(adRevenue * 100) / 100 };
}
export async function fetchMetrics(sa, propertyId, fetchFn = fetch, now = new Date()) {
  const token = await accessToken(sa, fetchFn);
  const one = async (slug) => {
    const r = await fetchFn(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify(reportBody(slug)) });
    if (!r.ok) throw new Error(`runReport ${r.status}`);
    return parseRow(await r.json());
  };
  const apps = {};
  for (const s of APP_SLUGS) apps[s] = await one(s);
  return { source: "Google Analytics 4 (API de datos)", fetchedAt: now.toISOString(), range: "últimos 28 días", overall: await one(null), apps };
}
