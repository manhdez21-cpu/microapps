import { describe, it } from "node:test";
import { expect } from "../../../packages/core/test/expect.ts";
import { addPet, addRecord, ageLabel, emptyData, fichaText, history, parseData, removePet, reminders, spendByMonth, spendByType, toCsv, totalSpent, updatePet, updateRecord, weightSeries, type Data } from "../src/state.ts";

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
  it("repetir cada N meses calcula la próxima fecha; una fecha explícita manda", () => {
    let d = addRecord(base(), { petId: "p1", type: "desparasitacion", date: "2026-11-30", title: "Antiparasitario", repeat: 3 }, "2026-11-30");
    expect(d.records[0]!.next).toBe("2027-02-28");
    expect(d.records[0]!.repeat).toBe(3);
    d = addRecord(d, { petId: "p1", type: "vacuna", date: "2026-11-01", title: "Rabia", repeat: 12, next: "2027-10-20" }, T);
    expect(d.records[1]!.next).toBe("2027-10-20");
    expect(() => addRecord(d, { petId: "p1", type: "vacuna", date: "2026-11-01", title: "x", repeat: 500 }, T)).toThrow();
    expect(() => addRecord(d, { petId: "p1", type: "vacuna", date: "2026-11-01", title: "x", repeat: 1.5 }, T)).toThrow();
  });
  it("editar un registro conserva id y lugar; valida igual que al crear", () => {
    let d = addRecord(base(), { petId: "p1", type: "vacuna", date: "2026-10-01", title: "Rabia", next: "2026-11-20" }, T);
    d = addRecord(d, { petId: "p1", type: "peso", date: "2026-10-15", weightG: 3800 }, T);
    d = updateRecord(d, "r2", { petId: "p1", type: "vacuna", date: "2026-10-02", title: "Rabia anual", detail: "Clínica Patitas", amount: 60000, next: "2027-10-02" }, T);
    expect(d.records.map((r) => r.id)).toEqual(["r2", "r3"]);
    expect([d.records[0]!.title, d.records[0]!.amount, d.records[0]!.next]).toEqual(["Rabia anual", 60000, "2027-10-02"]);
    expect(reminders(d, "p1", T).map((x) => x.rec.next)).toEqual(["2027-10-02"]);
    expect(() => updateRecord(d, "zz", { petId: "p1", type: "peso", date: T, weightG: 1000 }, T)).toThrow();
    expect(() => updateRecord(d, "r2", { petId: "p1", type: "vacuna", date: T, title: "" }, T)).toThrow();
    expect(() => updateRecord(d, "r3", { petId: "p1", type: "peso", date: T, weightG: 0 }, T)).toThrow();
  });
  it("editar la mascota conserva su foto salvo que se envíe otra", () => {
    let d = addPet(emptyData(), { name: "Luna", species: "gato", photo: "data:image/jpeg;base64,AAA" }, T);
    d = updatePet(d, "p1", { name: "Luna Luna", species: "gato", breed: "Angora", birth: "2022-01-01", sex: "hembra" }, T);
    expect([d.pets[0]!.name, d.pets[0]!.breed, d.pets[0]!.photo]).toEqual(["Luna Luna", "Angora", "data:image/jpeg;base64,AAA"]);
    d = updatePet(d, "p1", { name: "Luna", species: "gato", photo: "" }, T);
    expect(d.pets[0]!.photo).toBe("");
    expect(() => updatePet(d, "p1", { name: " ", species: "gato" }, T)).toThrow();
    expect(() => updatePet(d, "p9", { name: "X", species: "gato" }, T)).toThrow();
    expect(d.pets.length).toBe(1);
  });
  it("gastos por mes y por tipo", () => {
    let d = base();
    d = addRecord(d, { petId: "p1", type: "gasto", date: "2026-10-05", title: "Alimento", amount: 80000 }, T);
    d = addRecord(d, { petId: "p1", type: "consulta", date: "2026-10-20", title: "Control", amount: 70000 }, T);
    d = addRecord(d, { petId: "p1", type: "gasto", date: "2026-11-02", amount: 85000 }, T);
    d = addRecord(d, { petId: "p1", type: "peso", date: "2026-11-02", weightG: 9000 }, T);
    expect(spendByMonth(d, "p1")).toEqual([{ month: "2026-11", total: 85000 }, { month: "2026-10", total: 150000 }]);
    expect(spendByType(d, "p1")).toEqual([{ type: "gasto", total: 165000 }, { type: "consulta", total: 70000 }]);
    expect(spendByMonth(d, "p9")).toEqual([]);
  });
});
