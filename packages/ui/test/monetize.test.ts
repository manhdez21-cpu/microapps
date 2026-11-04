import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { adsEnabled, adsPlan } from "../src/monetize.ts";

const ok = { adsenseClient: "ca-pub-1234567890123456", adSlot: "1234567890" };
describe("monetize", () => {
  it("sin configuración válida no hay anuncios", () => {
    assert.equal(adsEnabled(undefined), false);
    assert.equal(adsEnabled({}), false);
    assert.equal(adsEnabled({ adsenseClient: "ca-pub-x", adSlot: "1" }), false);
    assert.equal(adsPlan({}, "granted"), "none");
  });
  it("sin consentimiento se pregunta; denegado nunca muestra", () => {
    assert.equal(adsPlan(ok, null), "ask");
    assert.equal(adsPlan(ok, "denied"), "none");
    assert.equal(adsPlan(ok, "granted"), "show");
  });
});

import { adPlacements, needsConsent } from "../src/monetize.ts";
import { appFromPath, ga4Enabled, nextVisits, parseVisits } from "../src/analytics.ts";
import { othersThan, shareText, whatsappUrl, APPS } from "../src/growth.ts";
describe("anuncios sin invadir", () => {
  it("máximo dos anuncios; uno solo en la app instalada", () => {
    assert.deepEqual(adPlacements(false), ["tool", "end"]);
    assert.deepEqual(adPlacements(true), ["tool"]);
  });
  it("el permiso se pide si hay anuncios o estadísticas válidos", () => {
    assert.equal(needsConsent({}), false);
    assert.equal(needsConsent({ ga4Id: "G-ABCDEF1234" }), true);
    assert.equal(needsConsent(ok), true);
  });
});
describe("analytics", () => {
  it("valida el ID de GA4", () => {
    assert.equal(ga4Enabled({ ga4Id: "G-ABCDEF1234" }), true);
    assert.equal(ga4Enabled({ ga4Id: "UA-123" }), false);
    assert.equal(ga4Enabled(undefined), false);
  });
  it("detecta la app por la ruta", () => {
    assert.equal(appFromPath("/microapps/apps/caja-clara/index.html"), "caja-clara");
    assert.equal(appFromPath("/index.html"), "portada");
    assert.equal(appFromPath("/guias/margen.html"), "guias");
  });
  it("cuenta la vuelta solo en días distintos", () => {
    const a = nextVisits(null, "2026-11-04");
    assert.deepEqual([a.visits.n, a.returning], [1, false]);
    const b = nextVisits(a.visits, "2026-11-04");
    assert.deepEqual([b.visits.n, b.returning], [1, false]);
    const c = nextVisits(b.visits, "2026-11-06");
    assert.deepEqual([c.visits.n, c.returning, c.visits.first], [2, true, "2026-11-04"]);
    assert.equal(parseVisits("{malo"), null);
    assert.equal(parseVisits(JSON.stringify(c.visits))?.n, 2);
  });
});
describe("crecimiento", () => {
  it("lista las otras 6 apps y arma el texto para compartir", () => {
    assert.equal(APPS.length, 7);
    assert.equal(othersThan("splitflow").length, 6);
    assert.equal(othersThan("splitflow").some((a) => a.slug === "splitflow"), false);
    assert.equal(whatsappUrl(shareText("X", "https://a.b/c")).startsWith("https://wa.me/?text="), true);
  });
});
