import { describe, it } from "node:test";
import { expect } from "../../core/test/expect.ts";
import { decodeBackup, encodeBackup } from "../src/backup.ts";

const KEYS = ["a.v1", "b.v1"];
describe("respaldo", () => {
  it("ida y vuelta conserva los datos", () => {
    const text = encodeBackup("app", { "a.v1": '{"x":1}' }, { f1: "data:image/png;base64,AAAA" }, new Date("2026-11-04T10:00:00Z"));
    const b = decodeBackup(text, "app", KEYS);
    expect(b.data["a.v1"]).toBe('{"x":1}');
    expect(b.blobs["f1"]).toBe("data:image/png;base64,AAAA");
    expect(b.exportedAt).toBe("2026-11-04T10:00:00.000Z");
  });
  it("rechaza otra app, basura y datos dañados", () => {
    expect(() => decodeBackup(encodeBackup("otra", { "a.v1": "{}" }, {}), "app", KEYS)).toThrow();
    expect(() => decodeBackup("no es json", "app", KEYS)).toThrow();
    expect(() => decodeBackup("[]", "app", KEYS)).toThrow();
    expect(() => decodeBackup(encodeBackup("app", { "a.v1": "{roto" }, {}), "app", KEYS)).toThrow();
    expect(() => decodeBackup(encodeBackup("app", {}, {}), "app", KEYS)).toThrow();
  });
  it("ignora claves no permitidas y adjuntos sospechosos", () => {
    const text = encodeBackup("app", { "a.v1": "{}", "intruso": "{}" }, { "ok-1": "data:text/plain;base64,QQ==", "../mal": "data:x", sin: "http://x" });
    const b = decodeBackup(text, "app", KEYS);
    expect(Object.keys(b.data)).toEqual(["a.v1"]);
    expect(Object.keys(b.blobs)).toEqual(["ok-1"]);
  });
});
