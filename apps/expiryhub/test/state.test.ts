import { describe, it } from "node:test";
import { expect } from "../../../packages/core/test/expect.ts";
import { addDoc, addProfile, emptyData, groups, monthGrid, parseData, removeDoc, removeProfile, renewDoc, rowsFor, setFile, toCsv, toIcs, type Data } from "../src/state.ts";

const T = "2026-11-04";
const sample = (): Data => {
  let d = addProfile(emptyData(), "Mi carro");
  const car = d.profiles[1]!.id, me = d.profiles[0]!.id;
  d = addDoc(d, { profileId: car, category: "soat", title: "SOAT Mazda", expiry: "2026-11-20" });
  d = addDoc(d, { profileId: car, category: "seguro", title: "Seguro todo riesgo", expiry: "2026-11-02" });
  d = addDoc(d, { profileId: me, category: "licencia", title: "Licencia de conducción", expiry: "2027-06-30" });
  d = addDoc(d, { profileId: me, category: "suscripcion", title: "Plan de celular", expiry: T });
  return d;
};
describe("expiryhub documentos", () => {
  it("perfiles: valida, no duplica, no borra con documentos", () => {
    expect(() => addProfile(emptyData(), " ")).toThrow();
    expect(() => addProfile(emptyData(), "yo")).toThrow();
    const d = sample();
    expect(() => removeProfile(d, d.profiles[1]!.id)).toThrow();
    expect(() => removeProfile(emptyData(), "u1")).toThrow();
    expect(removeProfile(addProfile(emptyData(), "Casa"), "u2").profiles.length).toBe(1);
  });
  it("aviso por defecto según tipo y validación", () => {
    const d = sample();
    expect(d.docs.map((x) => x.warnDays)).toEqual([30, 30, 45, 7]);
    expect(() => addDoc(d, { profileId: "u1", category: "soat", title: "", expiry: T })).toThrow();
    expect(() => addDoc(d, { profileId: "u1", category: "soat", title: "x", expiry: "2026-02-30" })).toThrow();
    expect(() => addDoc(d, { profileId: "u1", category: "soat", title: "x", expiry: T, warnDays: 400 })).toThrow();
    expect(() => addDoc(d, { profileId: "zz", category: "soat", title: "x", expiry: T })).toThrow();
  });
  it("agrupa por urgencia con el aviso de cada documento", () => {
    const g = groups(rowsFor(sample(), T));
    expect(g.map((x) => [x.key, x.rows.map((r) => r.doc.title)])).toEqual([
      ["expired", ["Seguro todo riesgo"]], ["today", ["Plan de celular"]], ["soon", ["SOAT Mazda"]], ["later", ["Licencia de conducción"]]]);
    expect(rowsFor(sample(), T, "u1").length).toBe(2);
  });
  it("renovar guarda el historial y exige fecha posterior", () => {
    const d = sample(); const id = d.docs[0]!.id;
    expect(() => renewDoc(d, id, "2026-11-20", T)).toThrow();
    const r = renewDoc(d, id, "2027-11-20", T);
    expect(r.docs[0]!.expiry).toBe("2027-11-20");
    expect(r.docs[0]!.renewals).toEqual([{ on: T, from: "2026-11-20", to: "2027-11-20" }]);
    expect(setFile(r, id, "k1").docs[0]!.file).toBe("k1");
    expect(removeDoc(r, id).docs.length).toBe(3);
  });
  it("cuadrícula del mes (lunes primero)", () => {
    const d = sample();
    const w = monthGrid(2026, 11, d.docs);
    expect(w.length).toBe(6);
    expect(w[0]!.findIndex((c) => c !== null)).toBe(6); // 1 nov 2026 es domingo
    const flat = w.flat().filter(Boolean);
    expect(flat.length).toBe(30);
    expect(flat.find((c) => c!.day === 20)!.docs.length).toBe(1);
    expect(w.every((wk) => wk.length === 7)).toBe(true);
  });
  it("ics: eventos de día completo con alarma y escapes", () => {
    let d = emptyData();
    d = addDoc(d, { profileId: "u1", category: "contrato", title: "Arriendo; local, centro", expiry: "2026-12-31", note: "Línea1\nLínea2" });
    const ics = toIcs(d, T);
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.includes("DTSTART;VALUE=DATE:20261231")).toBe(true);
    expect(ics.includes("DTEND;VALUE=DATE:20270101")).toBe(true);
    expect(ics.includes("SUMMARY:Vence: Arriendo\; local\\, centro")).toBe(true);
    expect(ics.includes("DESCRIPTION:Línea1\\nLínea2")).toBe(true);
    expect(ics.includes("TRIGGER:-P30D")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });
  it("csv y parseData", () => {
    expect(toCsv(sample(), T).split("\n").length).toBe(5);
    const bad = JSON.parse(JSON.stringify(sample())); bad.docs.push({ id: "dx", profileId: "nope", category: "soat", title: "x", expiry: T, warnDays: 1, note: "", file: "" }); bad.docs[0].renewals = "x";
    const ok = parseData(bad)!;
    expect(ok.docs.length).toBe(4);
    expect(ok.docs[0]!.renewals).toEqual([]);
    expect(parseData({ profiles: [], docs: [], nextId: 1 })).toBe(null);
  });
});
