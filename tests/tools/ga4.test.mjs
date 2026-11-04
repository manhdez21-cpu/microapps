import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, createVerify } from "node:crypto";
import { APP_SLUGS, fetchMetrics, parseRow, reportBody, signJwt } from "../../tools/lib/ga4.mjs";
const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const sa = { client_email: "x@y.iam.gserviceaccount.com", private_key: privateKey.export({ type: "pkcs8", format: "pem" }) };
describe("ga4", () => {
  it("firma un JWT RS256 verificable con los datos correctos", () => {
    const [h, b, s] = signJwt(sa, 1000).split(".");
    assert.equal(createVerify("RSA-SHA256").update(`${h}.${b}`).verify(publicKey, s, "base64url"), true);
    const p = JSON.parse(Buffer.from(b, "base64url"));
    assert.deepEqual([p.iss, p.iat, p.exp, p.scope.endsWith("analytics.readonly")], [sa.client_email, 1000, 4600, true]);
  });
  it("filtra por la ruta de cada app", () => {
    assert.equal(reportBody("caja-clara").dimensionFilter.filter.stringFilter.value, "/apps/caja-clara/");
    assert.equal(reportBody(null).dimensionFilter, undefined);
  });
  it("sin filas devuelve ceros reales y calcula los que regresan", () => {
    assert.deepEqual(parseRow({}), { views: 0, users: 0, newUsers: 0, returningUsers: 0, adRevenue: 0 });
    assert.deepEqual(parseRow({ rows: [{ metricValues: [{ value: "120" }, { value: "40" }, { value: "30" }, { value: "1.2345" }] }] }), { views: 120, users: 40, newUsers: 30, returningUsers: 10, adRevenue: 1.23 });
  });
  it("trae métricas de las 7 apps con un fetch simulado y falla si Google responde error", async () => {
    const calls = [];
    const f = async (url, init) => { calls.push(url); return url.includes("oauth2") ? { ok: true, json: async () => ({ access_token: "t" }) } : { ok: true, json: async () => ({ rows: [{ metricValues: [{ value: "5" }, { value: "2" }, { value: "2" }, { value: "0" }] }] }) }; };
    const m = await fetchMetrics(sa, "123", f, new Date("2026-11-04T00:00:00Z"));
    assert.deepEqual(Object.keys(m.apps), APP_SLUGS);
    assert.equal(m.overall.views, 5);
    assert.equal(calls.filter((u) => u.includes("properties/123")).length, 8);
    await assert.rejects(fetchMetrics(sa, "1", async () => ({ ok: false, status: 403 })), /token 403/);
  });
});
