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
