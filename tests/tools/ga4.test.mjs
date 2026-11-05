import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, createVerify } from "node:crypto";
import { APP_SLUGS, EVENTS, eventsBody, fetchMetrics, parseDaily, parseEvents, parseQueries, parseRow, parseSearch, reportBody, searchBody, signJwt } from "../../tools/lib/ga4.mjs";
const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const sa = { client_email: "x@y.iam.gserviceaccount.com", private_key: privateKey.export({ type: "pkcs8", format: "pem" }) };
describe("ga4", () => {
  it("firma un JWT RS256 verificable con los datos correctos", () => {
    const [h, b, s] = signJwt(sa, 1000).split(".");
    assert.equal(createVerify("RSA-SHA256").update(`${h}.${b}`).verify(publicKey, s, "base64url"), true);
    const p = JSON.parse(Buffer.from(b, "base64url"));
    assert.deepEqual([p.iss, p.iat, p.exp, p.scope.includes("analytics.readonly") && p.scope.includes("webmasters.readonly")], [sa.client_email, 1000, 4600, true]);
  });
  it("filtra por la ruta de cada app", () => {
    assert.equal(reportBody("caja-clara").dimensionFilter.filter.stringFilter.value, "/apps/caja-clara/");
    assert.equal(reportBody(null).dimensionFilter, undefined);
  });
  it("sin filas devuelve ceros reales y calcula los que regresan", () => {
    const zero = parseRow({});
    assert.deepEqual([zero.views, zero.users, zero.returningUsers, zero.adRevenue, zero.adImpressions], [0, 0, 0, 0, 0]);
    const resp = { metricHeaders: ["screenPageViews", "activeUsers", "newUsers", "sessions", "totalAdRevenue", "publisherAdImpressions", "publisherAdClicks"].map((name) => ({ name })),
      rows: [{ metricValues: ["120", "40", "30", "55", "1.2345", "900", "12"].map((value) => ({ value })) }] };
    const r = parseRow(resp);
    assert.deepEqual([r.views, r.users, r.newUsers, r.returningUsers, r.sessions, r.adRevenue, r.adImpressions, r.adClicks], [120, 40, 30, 10, 55, 1.23, 900, 12]);
  });
  it("eventos propios, serie diaria y búsquedas se leen por nombre", () => {
    assert.equal(eventsBody("caja-clara").dimensionFilter.andGroup.expressions.length, 2);
    assert.equal(eventsBody(null).dimensionFilter.andGroup.expressions.length, 1);
    const ev = parseEvents({ rows: [{ dimensionValues: [{ value: "share_click" }], metricValues: [{ value: "7" }] }, { dimensionValues: [{ value: "otro" }], metricValues: [{ value: "9" }] }] });
    assert.equal(ev.share_click, 7); assert.equal(Object.keys(ev).length, EVENTS.length);
    const d = parseDaily({ metricHeaders: [{ name: "activeUsers" }, { name: "screenPageViews" }, { name: "totalAdRevenue" }], rows: [{ dimensionValues: [{ value: "20261104" }], metricValues: [{ value: "3" }, { value: "9" }, { value: "0.5" }] }] });
    assert.deepEqual(d, [{ date: "2026-11-04", users: 3, views: 9, adRevenue: 0.5 }]);
    assert.deepEqual(parseSearch({ rows: [{ clicks: 2, impressions: 100, ctr: 0.02, position: 8.456 }] }), { clicks: 2, impressions: 100, ctr: 2, position: 8.46 });
    assert.deepEqual(parseSearch({}), { clicks: 0, impressions: 0, ctr: 0, position: 0 });
    assert.equal(parseQueries({ rows: [{ keys: ["dividir gastos"], clicks: 1, impressions: 10, position: 3 }] })[0].query, "dividir gastos");
    const b = searchBody("expiryhub", new Date("2026-11-05T00:00:00Z"));
    assert.deepEqual([b.startDate, b.endDate, b.dimensionFilterGroups[0].filters[0].expression], ["2026-10-06", "2026-11-03", "/apps/expiryhub/"]);
  });
  it("trae todo con un fetch simulado; Search Console puede fallar sin perder GA4; si GA4 falla, error", async () => {
    const calls = [];
    const mk = (sc) => async (url, init) => {
      calls.push(url);
      if (url.includes("oauth2")) return { ok: true, json: async () => ({ access_token: "t" }) };
      if (url.includes("searchconsole")) return sc ? { ok: true, json: async () => ({ rows: [{ clicks: 1, impressions: 10, ctr: 0.1, position: 5, keys: ["q"] }] }) } : { ok: false, status: 403 };
      const body = JSON.parse(init.body);
      if (body.dimensions?.[0]?.name === "date") return { ok: true, json: async () => ({ rows: [] }) };
      if (body.dimensions?.[0]?.name === "eventName") return { ok: true, json: async () => ({ rows: [] }) };
      return { ok: true, json: async () => ({ metricHeaders: body.metrics.map(({ name }) => ({ name })), rows: [{ metricValues: body.metrics.map((m) => ({ value: m.name === "screenPageViews" ? "5" : "2" })) }] }) };
    };
    const m = await fetchMetrics(sa, "123", mk(true), new Date("2026-11-04T00:00:00Z"));
    assert.deepEqual(Object.keys(m.apps), APP_SLUGS);
    assert.equal(m.overall.views, 5);
    assert.equal(calls.filter((u) => u.includes("properties/123")).length, 8 * 2 + 1);
    assert.equal(m.search.apps["caja-clara"].clicks, 1);
    assert.equal(m.search.queries[0].query, "q");
    const m2 = await fetchMetrics(sa, "123", mk(false), new Date("2026-11-04T00:00:00Z"));
    assert.equal(m2.search, null); assert.match(m2.searchError, /403/); assert.equal(m2.overall.views, 5);
    await assert.rejects(fetchMetrics(sa, "1", async () => ({ ok: false, status: 403 })), /token 403/);
  });
});
