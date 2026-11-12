import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { anchorVisible, checkoutHref, isProApp, PRO_ANCHOR_USD, PRO_APPS, PRO_CONFIG, PRO_PRICE_USD, PRO_PUBLIC_KEYS, priceLabel } from "../src/config.ts";
import { b64urlDecode, b64urlEncode, parsePayload, verifyLicense } from "../src/license.ts";
import { LICENSE_KEY, parseLicenses, readLicenses, removeLicense, saveLicense, type KV } from "../src/store.ts";
import { activateLicense, deactivateLicense, initPro, isPro, onProChange } from "../src/state.ts";
import { detectStore } from "../src/store-flag.ts";
import { requirePro } from "../src/gate.ts";
// @ts-ignore herramienta en JavaScript sin tipos
import { generateKeys, signLicense } from "../../../tools/pro-license.mjs";

const memory = (): KV & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => { data.set(k, v); } };
};
const broken: KV = { getItem: () => { throw new Error("bloqueado"); }, setItem: () => { throw new Error("cuota"); } };

let keys: { publicKey: string; privateKey: string }, other: { publicKey: string; privateKey: string };
let token = "";
before(async () => {
  keys = await generateKeys(); other = await generateKeys();
  token = await signLicense({ app: "splitflow", id: "PEDIDO-0001", iat: "2026-11-12" }, keys.privateKey);
});

describe("config", () => {
  it("precio único USD 15 en las 4 apps y ancla mayor que el precio", () => {
    assert.equal(PRO_PRICE_USD, 15);
    assert.deepEqual([...PRO_APPS], ["splitflow", "caja-clara", "priceright", "huella-al-dia"]);
    assert.equal(priceLabel(PRO_PRICE_USD), "USD 15");
    assert.equal(anchorVisible(), PRO_ANCHOR_USD > PRO_PRICE_USD);
    assert.equal(anchorVisible(15, 0), false);
    assert.equal(anchorVisible(15, 15), false);
    assert.equal(anchorVisible(15, 29), true);
  });
  it("cada app tiene nombre, mensaje propio y beneficios", () => {
    const pitches = new Set<string>();
    for (const a of PRO_APPS) { const c = PRO_CONFIG[a]; assert.ok(c.name && c.pitch && c.benefits.length >= 2, a); pitches.add(c.pitch); }
    assert.equal(pitches.size, PRO_APPS.length);
  });
  it("solo las 4 apps son Pro", () => {
    assert.equal(isProApp("splitflow"), true);
    for (const x of ["expiryhub", "warranty-keeper", "cuanto-me-sobra", "", null, 3]) assert.equal(isProApp(x), false);
  });
  it("el enlace de pago solo vale si es https", () => {
    const cfg = (url: string) => ({ ...PRO_CONFIG, splitflow: { ...PRO_CONFIG.splitflow, checkoutUrl: url } });
    assert.equal(checkoutHref("splitflow", cfg("")), null);
    assert.equal(checkoutHref("splitflow", cfg("javascript:alert(1)")), null);
    assert.equal(checkoutHref("splitflow", cfg("http://pago.example/x")), null);
    assert.equal(checkoutHref("splitflow", cfg("https://pago.example/x")), "https://pago.example/x");
  });
  it("el repositorio no trae una clave pública de prueba por accidente", () => {
    for (const k of PRO_PUBLIC_KEYS) assert.equal(b64urlDecode(k)?.length, 65);
  });
});

describe("licencia firmada", () => {
  it("base64url ida y vuelta; rechaza caracteres ajenos", () => {
    const bytes = new Uint8Array([0, 255, 62, 63, 1, 2, 3]);
    assert.deepEqual([...b64urlDecode(b64urlEncode(bytes))!], [...bytes]);
    assert.equal(b64urlDecode("a+b/"), null);
    assert.equal(b64urlDecode("a"), null);
  });
  it("validador propio del contenido", () => {
    const ok = { v: 1, app: "splitflow", id: "PEDIDO-0001", iat: "2026-11-12" };
    assert.deepEqual(parsePayload(ok), ok);
    for (const bad of [null, [], "x", { ...ok, v: 2 }, { ...ok, app: "expiryhub" }, { ...ok, id: "a" }, { ...ok, id: "con espacio" }, { ...ok, iat: "12/11/2026" }, { ...ok, iat: "2026-13-45" }, { ...ok, extra: 1 }, { v: 1, app: "splitflow", id: "PEDIDO-0001" }]) assert.equal(parsePayload(bad), null, JSON.stringify(bad));
  });
  it("una licencia bien firmada se acepta, también con espacios y saltos de línea", async () => {
    const r = await verifyLicense(token, "splitflow", [keys.publicKey]);
    assert.deepEqual(r, { ok: true, payload: { v: 1, app: "splitflow", id: "PEDIDO-0001", iat: "2026-11-12" } });
    const wrapped = ` ${token.slice(0, 40)}\n${token.slice(40, 90)} ${token.slice(90)}\n`;
    assert.equal((await verifyLicense(wrapped, "splitflow", [keys.publicKey])).ok, true);
  });
  it("rotación: vale con cualquiera de las claves públicas y salta las mal formadas", async () => {
    assert.equal((await verifyLicense(token, "splitflow", ["basura", other.publicKey, keys.publicKey])).ok, true);
  });
  it("no sirve para otra app", async () => {
    assert.deepEqual(await verifyLicense(token, "caja-clara", [keys.publicKey]), { ok: false, error: "app" });
  });
  it("firmada con otra clave: rechazada", async () => {
    assert.deepEqual(await verifyLicense(token, "splitflow", [other.publicKey]), { ok: false, error: "firma" });
  });
  it("datos alterados (cambiar la app) invalidan la firma", async () => {
    const [p, , sig] = token.split(".");
    const forged = b64urlEncode(new TextEncoder().encode(JSON.stringify({ v: 1, app: "caja-clara", id: "PEDIDO-0001", iat: "2026-11-12" })));
    assert.deepEqual(await verifyLicense(`${p}.${forged}.${sig}`, "caja-clara", [keys.publicKey]), { ok: false, error: "firma" });
  });
  it("formatos rotos nunca lanzan", async () => {
    const [p, body, sig] = token.split(".");
    for (const bad of ["", "hola", "CT1..", `CT2.${body}.${sig}`, `${p}.${body}`, `${p}.${body}.${sig!.slice(0, 20)}`, `${p}.!!!.${sig}`, `${p}.${b64urlEncode(new TextEncoder().encode("no json"))}.${sig}`, `${p}.${body}.${sig}.x`])
      assert.deepEqual(await verifyLicense(bad, "splitflow", [keys.publicKey]), { ok: false, error: "formato" }, bad);
  });
  it("falla cerrado: sin clave pública o sin WebCrypto nadie es Pro", async () => {
    assert.deepEqual(await verifyLicense(token, "splitflow", []), { ok: false, error: "sin-clave" });
    assert.deepEqual(await verifyLicense(token, "splitflow", [keys.publicKey], null), { ok: false, error: "no-soportado" });
  });
  it("la herramienta no firma datos inválidos ni sin clave privada", async () => {
    await assert.rejects(signLicense({ app: "expiryhub", id: "PEDIDO-0001" }, keys.privateKey));
    await assert.rejects(signLicense({ app: "splitflow", id: "x" }, keys.privateKey));
    await assert.rejects(signLicense({ app: "splitflow", id: "PEDIDO-0001" }, ""));
  });
});

describe("guardado local", () => {
  it("guarda una licencia por app sin pisar las otras, y las quita", () => {
    const kv = memory();
    assert.equal(saveLicense("splitflow", "CT1.a.b", kv), true);
    assert.equal(saveLicense("priceright", "CT1.c.d", kv), true);
    assert.deepEqual(readLicenses(kv), { splitflow: "CT1.a.b", priceright: "CT1.c.d" });
    assert.equal(removeLicense("splitflow", kv), true);
    assert.deepEqual(readLicenses(kv), { priceright: "CT1.c.d" });
  });
  it("datos corruptos o claves ajenas se ignoran", () => {
    const kv = memory();
    kv.data.set(LICENSE_KEY, "{no json");
    assert.deepEqual(readLicenses(kv), {});
    assert.deepEqual(parseLicenses({ splitflow: 5, expiryhub: "x", priceright: "ok", "huella-al-dia": "x".repeat(601) }), { priceright: "ok" });
    assert.deepEqual(parseLicenses([1]), {});
  });
  it("sin almacenamiento no revienta", () => {
    assert.deepEqual(readLicenses(broken), {});
    assert.equal(saveLicense("splitflow", "t", broken), false);
    assert.equal(saveLicense("splitflow", "t", null), false);
    assert.equal(removeLicense("splitflow", null), false);
  });
});

describe("isPro / activar / requirePro", () => {
  it("flujo completo: gratis → activar → Pro → reinicio → desactivar", async () => {
    const kv = memory(), deps = { kv, keys: [keys.publicKey] };
    const seen: string[] = [];
    const off = onProChange((a) => seen.push(a));
    assert.equal(await initPro("splitflow", deps), false);
    assert.equal(isPro("splitflow"), false);
    assert.equal(isPro(), false); // usa la app de initPro

    const opened: unknown[] = [];
    assert.equal(requirePro({ feature: "Exportar CSV" }, (app, o) => opened.push([app, o.feature])), false);
    assert.deepEqual(opened, [["splitflow", "Exportar CSV"]]);

    assert.deepEqual(await activateLicense("splitflow", "no es una licencia", deps), { ok: false, error: "formato" });
    assert.equal(isPro("splitflow"), false);
    assert.deepEqual(await activateLicense("caja-clara", token, deps), { ok: false, error: "app" });
    assert.equal(kv.data.size, 0);

    assert.deepEqual(await activateLicense("splitflow", `  ${token}\n`, deps), { ok: true, stored: true });
    assert.equal(isPro("splitflow"), true);
    assert.equal(isPro("caja-clara"), false); // la licencia es por app
    assert.equal(readLicenses(kv).splitflow, token);
    assert.equal(requirePro({}, () => assert.fail("no debe abrir el modal")), true);
    assert.deepEqual(seen, ["splitflow"]);

    assert.equal(await initPro("splitflow", deps), true); // «reinicio»: se vuelve a verificar lo guardado
    assert.deepEqual(seen, ["splitflow"]); // sin cambio, sin aviso

    deactivateLicense("splitflow", deps);
    assert.equal(isPro("splitflow"), false);
    assert.deepEqual(readLicenses(kv), {});
    assert.deepEqual(seen, ["splitflow", "splitflow"]);
    off();
  });
  it("una licencia guardada pero manipulada no da Pro al iniciar", async () => {
    const kv = memory();
    saveLicense("priceright", token.replace("CT1.", "CT1.x"), kv);
    assert.equal(await initPro("priceright", { kv, keys: [keys.publicKey] }), false);
    saveLicense("priceright", token, kv); // válida, pero de SplitFlow
    assert.equal(await initPro("priceright", { kv, keys: [keys.publicKey] }), false);
    assert.equal(isPro("priceright"), false);
  });
  it("con la clave del repositorio (ninguna aún) una licencia de prueba no activa nada", async () => {
    const kv = memory();
    const r = await activateLicense("splitflow", token, { kv });
    assert.equal(r.ok, false);
    assert.equal(kv.data.size, 0);
  });
  it("si no se puede guardar, queda Pro en la sesión y lo dice", async () => {
    assert.deepEqual(await activateLicense("huella-al-dia", await signLicense({ app: "huella-al-dia", id: "PEDIDO-0002" }, keys.privateKey), { kv: broken, keys: [keys.publicKey] }), { ok: true, stored: false });
    assert.equal(isPro("huella-al-dia"), true);
    deactivateLicense("huella-al-dia", { kv: broken });
  });
});

describe("flag de Google Play (TWA)", () => {
  it("la compra se ve en la web y se oculta con cualquiera de las señales", () => {
    assert.equal(detectStore({}), false);
    assert.equal(detectStore({ referrer: "https://www.google.com/", search: "?utm=x", remembered: null, configFlag: undefined }), false);
    assert.equal(detectStore({ configFlag: true }), true);
    assert.equal(detectStore({ configFlag: "true" }), false); // solo el booleano
    assert.equal(detectStore({ referrer: "android-app://com.chispatools.splitflow/" }), true);
    assert.equal(detectStore({ search: "?tienda=play" }), true);
    assert.equal(detectStore({ search: "?tienda=web" }), false);
    assert.equal(detectStore({ remembered: "play" }), true);
  });
});
