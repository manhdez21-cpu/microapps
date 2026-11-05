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
import { backupState, cloudEnabled, cloudFileName, driveFind, driveLoad, driveSave, fingerprint, sinceText } from "../src/cloud.ts";
import { feedbackUrl, othersThan, shareText, whatsappUrl, APPS, relatedFor, RELATED } from "../src/growth.ts";
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
  it("cada app sugiere una sola app relacionada, distinta de sí misma", () => {
    for (const a of APPS) { const r = relatedFor(a.slug); assert.ok(r, a.slug); assert.notEqual(r!.app.slug, a.slug); }
    assert.equal(Object.keys(RELATED).length, 7);
  });
  it("lista las otras 6 apps y arma el texto para compartir", () => {
    assert.equal(APPS.length, 7);
    assert.equal(othersThan("splitflow").length, 6);
    assert.equal(othersThan("splitflow").some((a) => a.slug === "splitflow"), false);
    assert.equal(whatsappUrl(shareText("X", "https://a.b/c")).startsWith("https://wa.me/?text="), true);
  });
});

describe("respaldo en Google Drive", () => {
  const ID = "123456789012-abcdefghij0123456789.apps.googleusercontent.com";
  /** Drive simulado en memoria. */
  const fakeDrive = () => {
    const files = new Map<string, { name: string; body: string }>(); const calls: string[] = [];
    const f = async (url: string, init: RequestInit = {}): Promise<Response> => {
      calls.push(`${init.method ?? "GET"} ${url.split("?")[0]}`);
      if ((init.headers as Record<string, string>).Authorization !== "Bearer tok") return new Response("", { status: 401 });
      if (url.includes("/upload/")) {
        const m = /\r\n\r\n(\{.*?\})\r\n--[\s\S]*?\r\n\r\n([\s\S]*?)\r\n--[\w]+--$/.exec(String(init.body))!;
        const meta = JSON.parse(m[1]!); const id = url.match(/files\/([^?]+)\?/)?.[1] ?? `id${files.size + 1}`;
        files.set(id, { name: meta.name, body: m[2]! }); return new Response("{}");
      }
      if (url.includes("alt=media")) return new Response(files.get(url.match(/files\/([^?]+)\?/)![1]!)!.body);
      const name = decodeURIComponent(/name%3D'([^']+)'/.exec(url)?.[1] ?? "");
      const hit = [...files].find(([, v]) => v.name === name);
      return new Response(JSON.stringify({ files: hit ? [{ id: hit[0], modifiedTime: "2026-11-05T00:00:00Z" }] : [] }));
    };
    return { f, files, calls };
  };
  it("valida el ID de cliente (solo formato público de Google)", () => {
    assert.equal(cloudEnabled(ID), true);
    assert.equal(cloudEnabled(""), false);
    assert.equal(cloudEnabled("G-ABCDEF1234"), false);
    assert.equal(cloudEnabled(undefined), false);
  });
  it("guarda, reemplaza y descarga el respaldo; sin respaldo devuelve null", async () => {
    const d = fakeDrive();
    assert.equal(await driveLoad("tok", "caja-clara", d.f), null);
    await driveSave("tok", "caja-clara", '{"a":1}', d.f);
    assert.equal(d.files.size, 1);
    assert.equal((await driveLoad("tok", "caja-clara", d.f))?.text, '{"a":1}');
    await driveSave("tok", "caja-clara", '{"a":2}', d.f);
    assert.equal(d.files.size, 1, "reemplaza, no duplica");
    assert.equal((await driveLoad("tok", "caja-clara", d.f))?.text, '{"a":2}');
    assert.equal(await driveFind("tok", "otra", d.f), null);
    assert.equal(cloudFileName("huella-al-dia"), "respaldo-huella-al-dia.json");
  });
  it("un token rechazado da un mensaje claro", async () => {
    await assert.rejects(driveSave("malo", "x", "{}", fakeDrive().f), /no autorizó/);
  });
});
describe("aviso de respaldo", () => {
  it("la huella cambia solo si cambian los datos", () => {
    assert.equal(fingerprint(["a", null]), fingerprint(["a", null]));
    assert.notEqual(fingerprint(["a", null]), fingerprint(["a", "b"]));
    assert.notEqual(fingerprint(["ab", ""]), fingerprint(["a", "b"]));
  });
  it("estado: sin respaldo, al día o con cambios", () => {
    const f = fingerprint(["x"]);
    assert.equal(backupState(null, f), "none");
    assert.equal(backupState({ h: f }, f), "synced");
    assert.equal(backupState({ h: f }, fingerprint(["y"])), "dirty");
  });
  it("texto de tiempo en español", () => {
    const now = new Date("2026-11-05T12:00:00Z");
    assert.equal(sinceText("2026-11-05T01:00:00Z", now), "hoy");
    assert.equal(sinceText("2026-11-04T01:00:00Z", now), "ayer");
    assert.equal(sinceText("2026-10-26T12:00:00Z", now), "hace 10 días");
    assert.equal(sinceText("2026-08-01T12:00:00Z", now), "hace 3 meses");
    assert.equal(sinceText("no-fecha", now), "hace un tiempo");
  });
});

describe("sugerencias", () => {
  it("prefiere WhatsApp, cae a correo y no inventa enlaces", () => {
    assert.match(feedbackUrl({ contactWhatsapp: "573001112233", contactEmail: "a@b.co" }, "Caja Clara")!, /^https:\/\/wa\.me\/573001112233\?text=.*Caja%20Clara/);
    assert.match(feedbackUrl({ contactEmail: "a@b.co" }, "X")!, /^mailto:a@b\.co\?subject=/);
    assert.equal(feedbackUrl({ contactWhatsapp: "abc" }, "X"), null);
    assert.equal(feedbackUrl(undefined, "X"), null);
  });
});
