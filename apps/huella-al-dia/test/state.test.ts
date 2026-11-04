import { describe, it } from "node:test";
import { expect } from "../../../packages/core/test/expect.ts";
import { addPet, addRecord, ageLabel, emptyData, fichaText, history, parseData, removePet, reminders, toCsv, totalSpent, weightSeries, type Data } from "../src/state.ts";

const T = "2026-11-04";
const base = (): Data => addPet(emptyData(), { name: "Luna", species: "perro", breed: "Criollo", birth: "2023-05-10" }, T);
describe("huella al día", () => {
  it("valida la mascota", () => {
    expect(() => addPet(emptyData(), { name: " ", species: "perro" }, T)).toThrow();
    expect(() => addPet(emptyData(), { name: "X", species: "pez" as never }, T)).toThrow();
    expect(() => addPet(emptyData(), { name: "X", species: "gato", birth: "2027-01-01" }, T)).toThrow();
    let d = emptyData(); for (let i = 0; i < 5; i++) d = addPet(d, { name: "M" + i, species: "gato" }, T);
    expect(() => addPet(d, { name: "Otra", species: "gato" }, T)).toThrow();
  });
  it("edad en lenguaje de persona", () => {
    expect(ageLabel("2023-05-10", T)).toBe("3 años y 5 meses");
    expect(ageLabel("2024-11-04", T)).toBe("2 años");
    expect(ageLabel("2026-06-04", T)).toBe("5 meses");
    expect(ageLabel("2026-10-10", T)).toBe("3 semanas");
    expect(ageLabel("2026-11-01", T)).toBe("3 días");
    expect(ageLabel("2027-01-01", T)).toBe("");
  });
  it("valida registros", () => {
    const d = base(); const id = d.pets[0].id;
    expect(() => addRecord(d, { petId: id, type: "vacuna", date: T }, T)).toThrow();
    expect(() => addRecord(d, { petId: id, type: "vacuna", title: "Rabia", date: "2026-11-05" }, T)).toThrow();
    expect(() => addRecord(d, { petId: id, type: "peso", date: T }, T)).toThrow();
    expect(() => addRecord(d, { petId: id, type: "gasto", date: T }, T)).toThrow();
    expect(() => addRecord(d, { petId: id, type: "vacuna", title: "Rabia", date: T, next: T }, T)).toThrow();
    expect(() => addRecord(d, { petId: "nope", type: "bano", date: T }, T)).toThrow();
    expect(addRecord(d, { petId: id, type: "bano", date: T }, T).records.length).toBe(1);
  });
  it("recordatorio pendiente hasta que se repite la dosis", () => {
    let d = base(); const id = d.pets[0].id;
    d = addRecord(d, { petId: id, type: "vacuna", title: "Rabia", date: "2025-11-10", next: "2026-11-10" }, T);
    d = addRecord(d, { petId: id, type: "desparasitacion", title: "Interna", date: "2026-08-01", next: "2026-10-30" }, T);
    let r = reminders(d, id, T);
    expect(r.map((x) => [x.rec.title, x.state, x.daysLeft])).toEqual([["Interna", "expired", -5], ["Rabia", "soon", 6]]);
    d = addRecord(d, { petId: id, type: "vacuna", title: " rabia ", date: "2026-11-03", next: "2027-11-03" }, T);
    r = reminders(d, id, T);
    expect(r.map((x) => x.rec.title)).toEqual(["Interna", "rabia"]);
    expect(r.find((x) => x.rec.next === "2027-11-03")?.state).toBe("ok");
  });
  it("peso en gramos, serie ordenada y gastos en enteros", () => {
    let d = base(); const id = d.pets[0].id;
    d = addRecord(d, { petId: id, type: "peso", date: "2026-09-01", weightG: 12500 }, T);
    d = addRecord(d, { petId: id, type: "peso", date: "2026-07-01", weightG: 11800 }, T);
    d = addRecord(d, { petId: id, type: "consulta", title: "Control", date: T, amount: 85000 }, T);
    d = addRecord(d, { petId: id, type: "gasto", title: "Alimento", date: T, amount: 120000 }, T);
    expect(weightSeries(d, id).map((x) => x.grams)).toEqual([11800, 12500]);
    expect(totalSpent(d, id)).toBe(205000);
    expect(history(d, id)[0].date).toBe(T);
  });
  it("ficha y csv no inventan datos", () => {
    let d = base(); const id = d.pets[0].id;
    d = addRecord(d, { petId: id, type: "vacuna", title: "Rabia", date: "2025-11-10", next: "2026-11-10" }, T);
    d = addRecord(d, { petId: id, type: "peso", date: T, weightG: 12500 }, T);
    const f = fichaText(d, id, T);
    expect(f.includes("Ficha de Luna")).toBe(true);
    expect(f.includes("Último peso: 12,5 kg")).toBe(true);
    expect(f.includes("Rabia: 2025-11-10 (próxima: 2026-11-10)")).toBe(true);
    expect(f.includes("No es un documento veterinario")).toBe(true);
    expect(toCsv(d, id).split("\n").length).toBe(3);
  });
  it("borrar mascota borra sus registros; parseData filtra basura", () => {
    let d = base(); const id = d.pets[0].id;
    d = addRecord(d, { petId: id, type: "bano", date: T }, T);
    expect(removePet(d, id).records.length).toBe(0);
    const bad = JSON.parse(JSON.stringify(d)); bad.records.push({ id: "r9", petId: "zzz", type: "bano", date: T, title: "", detail: "" }); bad.records.push({ id: "r8", petId: id, type: "bano", date: "2026-13-01", title: "", detail: "" });
    expect(parseData(bad)?.records.length).toBe(1);
    expect(parseData({})).toBe(null);
  });
});
