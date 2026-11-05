// Cliente mínimo de las APIs de Google (GA4 Data API y Search Console) con cuenta de servicio.
// Solo node:crypto, sin dependencias. Las credenciales llegan por variables de entorno; nada se guarda en el repositorio.
import { createSign } from "node:crypto";
export const APP_SLUGS = ["splitflow", "caja-clara", "priceright", "cuanto-me-sobra", "expiryhub", "warranty-keeper", "huella-al-dia"];
export const EVENTS = ["first_use", "install_click", "share_click", "feedback_click", "cross_link"];
const SCOPES = "https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/webmasters.readonly";
const b64 = (x) => Buffer.from(x).toString("base64url");
export function signJwt(sa, now = Math.floor(Date.now() / 1000)) {
  const head = b64(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const body = b64(JSON.stringify({ iss: sa.client_email, scope: SCOPES, aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }));
  const sig = createSign("RSA-SHA256").update(`${head}.${body}`).sign(sa.private_key, "base64url");
  return `${head}.${body}.${sig}`;
}
export async function accessToken(sa, fetchFn = fetch) {
  const r = await fetchFn("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: signJwt(sa) }) });
  if (!r.ok) throw new Error(`token ${r.status}`);
  return (await r.json()).access_token;
}

const METRICS = ["screenPageViews", "activeUsers", "newUsers", "sessions", "totalAdRevenue", "publisherAdImpressions", "publisherAdClicks"];
const pathFilter = (slug) => ({ filter: { fieldName: "pagePath", stringFilter: { matchType: "CONTAINS", value: `/apps/${slug}/` } } });
export const reportBody = (slug) => ({
  dateRanges: [{ startDate: "28daysAgo", endDate: "today" }],
  metrics: METRICS.map((name) => ({ name })),
  ...(slug ? { dimensionFilter: pathFilter(slug) } : {}),
});
/** Eventos propios (solo nombres de acción, nunca texto del usuario) por app. */
export const eventsBody = (slug) => ({
  dateRanges: [{ startDate: "28daysAgo", endDate: "today" }],
  dimensions: [{ name: "eventName" }], metrics: [{ name: "eventCount" }],
  dimensionFilter: { andGroup: { expressions: [
    ...(slug ? [pathFilter(slug)] : []),
    { filter: { fieldName: "eventName", inListFilter: { values: EVENTS } } },
  ] } },
});
export const dailyBody = () => ({
  dateRanges: [{ startDate: "27daysAgo", endDate: "today" }],
  dimensions: [{ name: "date" }], metrics: ["activeUsers", "screenPageViews", "totalAdRevenue"].map((name) => ({ name })),
  orderBys: [{ dimension: { dimensionName: "date" } }],
});
const r2 = (n) => Math.round(n * 100) / 100;
const emptyEvents = () => Object.fromEntries(EVENTS.map((e) => [e, 0]));
/** Convierte la respuesta de runReport (una fila de totales) en números, por nombre de métrica; sin filas = 0 reales. */
export function parseRow(resp) {
  const names = resp?.metricHeaders?.map((m) => m.name) ?? METRICS;
  const vals = resp?.rows?.[0]?.metricValues?.map((m) => Number(m.value)) ?? [];
  const get = (n) => { const i = names.indexOf(n); return i >= 0 && Number.isFinite(vals[i]) ? vals[i] : 0; };
  const users = get("activeUsers"), newUsers = get("newUsers");
  return {
    views: get("screenPageViews"), users, newUsers, returningUsers: Math.max(0, users - newUsers), sessions: get("sessions"),
    adRevenue: r2(get("totalAdRevenue")), adImpressions: get("publisherAdImpressions"), adClicks: get("publisherAdClicks"), events: emptyEvents(),
  };
}
export function parseEvents(resp) {
  const out = emptyEvents();
  for (const row of resp?.rows ?? []) { const n = row.dimensionValues?.[0]?.value; if (n in out) out[n] = Number(row.metricValues?.[0]?.value ?? 0); }
  return out;
}
export function parseDaily(resp) {
  const names = resp?.metricHeaders?.map((m) => m.name) ?? ["activeUsers", "screenPageViews", "totalAdRevenue"];
  return (resp?.rows ?? []).map((row) => {
    const v = row.metricValues.map((m) => Number(m.value)); const d = row.dimensionValues[0].value;
    return { date: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`, users: v[names.indexOf("activeUsers")] ?? 0, views: v[names.indexOf("screenPageViews")] ?? 0, adRevenue: r2(v[names.indexOf("totalAdRevenue")] ?? 0) };
  });
}

/** Search Console: clics, impresiones, CTR y posición media por app; más las 10 consultas principales. */
const ymd = (d) => d.toISOString().slice(0, 10);
export function searchBody(slug, now, dimensions = []) {
  const end = new Date(now.getTime() - 2 * 86400000), start = new Date(now.getTime() - 30 * 86400000); // Search Console tiene ~2 días de retraso
  return {
    startDate: ymd(start), endDate: ymd(end), dimensions,
    ...(dimensions.length ? { rowLimit: 10 } : {}),
    ...(slug ? { dimensionFilterGroups: [{ filters: [{ dimension: "page", operator: "contains", expression: `/apps/${slug}/` }] }] } : {}),
  };
}
export const parseSearch = (resp) => { const x = resp?.rows?.[0]; return { clicks: x?.clicks ?? 0, impressions: x?.impressions ?? 0, ctr: r2((x?.ctr ?? 0) * 100), position: r2(x?.position ?? 0) }; };
export const parseQueries = (resp) => (resp?.rows ?? []).map((x) => ({ query: String(x.keys?.[0] ?? ""), clicks: x.clicks ?? 0, impressions: x.impressions ?? 0, position: r2(x.position ?? 0) }));

async function fetchSearch(token, site, fetchFn, now) {
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`;
  const q = async (body) => {
    const r = await fetchFn(url, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error(`searchAnalytics ${r.status}`);
    return r.json();
  };
  const apps = {};
  for (const s of APP_SLUGS) apps[s] = parseSearch(await q(searchBody(s, now)));
  return { site, overall: parseSearch(await q(searchBody(null, now))), apps, queries: parseQueries(await q(searchBody(null, now, ["query"]))) };
}

/**
 * Trae GA4 (obligatorio) y Search Console (si falla, se informa el motivo y el resto sigue).
 * Los ingresos de AdSense llegan por GA4 cuando la cuenta de AdSense está vinculada a la propiedad.
 */
export async function fetchMetrics(sa, propertyId, fetchFn = fetch, now = new Date(), site = "sc-domain:chispatools.com") {
  const token = await accessToken(sa, fetchFn);
  const run = async (body) => {
    const r = await fetchFn(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error(`runReport ${r.status}`);
    return r.json();
  };
  const one = async (slug) => { const row = parseRow(await run(reportBody(slug))); row.events = parseEvents(await run(eventsBody(slug))); return row; };
  const apps = {};
  for (const s of APP_SLUGS) apps[s] = await one(s);
  const out = { source: "Google Analytics 4 (API de datos) y Search Console", fetchedAt: now.toISOString(), range: "últimos 28 días", overall: await one(null), apps, daily: parseDaily(await run(dailyBody())), search: null, searchError: null };
  try { out.search = await fetchSearch(token, site, fetchFn, now); } catch (e) { out.searchError = e.message; }
  return out;
}
