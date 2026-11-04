import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  addExpense,
  addPerson,
  byCategory,
  byPerson,
  recordPayment,
  summaryText,
  updateExpense,
  emptyState,
  equalPercents,
  newGroup,
  parseState,
  removeExpense,
  removePerson,
  summarize,
  toCsv,
  type Group,
} from "../src/state.ts";

function base(): Group {
  let g = newGroup("Viaje", "COP", "2026-11-04T00:00:00Z", "g1");
  g = addPerson(g, "Ana", "a");
  g = addPerson(g, "Beto", "b");
  g = addPerson(g, "Caro", "c");
  return g;
}

describe("grupo y personas", () => {
  it("rechaza nombres vacíos y duplicados (sin distinguir mayúsculas)", () => {
    const g = base();
    assert.throws(() => addPerson(g, "  "));
    assert.throws(() => addPerson(g, "ana"));
    assert.throws(() => newGroup("  ", "COP"));
  });
  it("no deja quitar a quien participa en gastos", () => {
    let g = base();
    g = addExpense(g, { description: "Cena", amount: 90000, paidBy: "a", mode: "equal", participants: ["a", "b", "c"] }, "e1");
    assert.throws(() => removePerson(g, "b"));
    g = removeExpense(g, "e1");
    assert.equal(removePerson(g, "b").people.length, 2);
  });
});

describe("gastos y liquidación", () => {
  it("equitativo: Ana paga 90.000 entre 3 → Beto y Caro le deben 30.000", () => {
    let g = base();
    g = addExpense(g, { description: "Cena", amount: 90000, paidBy: "a", mode: "equal", participants: ["a", "b", "c"] }, "e1");
    const s = summarize(g);
    assert.deepEqual(s.balances, { a: 60000, b: -30000, c: -30000 });
    assert.equal(s.transfers.length, 2);
    assert.equal(s.total, 90000);
    assert.ok(s.transfers.every((t) => t.to === "a" && t.amount === 30000));
  });
  it("resto de centavos se reparte sin perder nada", () => {
    let g = newGroup("X", "USD", "t", "g");
    g = addPerson(addPerson(addPerson(g, "A", "a"), "B", "b"), "C", "c");
    g = addExpense(g, { description: "Taxi", amount: 1000, paidBy: "a", mode: "equal", participants: ["a", "b", "c"] }, "e");
    const total = Object.values(g.expenses[0]!.shares).reduce((x, y) => x + y, 0);
    assert.equal(total, 1000);
  });
  it("porcentajes deben sumar 100 %", () => {
    const g = base();
    assert.throws(
      () => addExpense(g, { description: "x", amount: 1000, paidBy: "a", mode: "percent", participants: ["a", "b"], percents: { a: 5000, b: 4000 } }),
      /suman 90\.00 %/,
    );
    const ok = addExpense(g, { description: "x", amount: 1000, paidBy: "a", mode: "percent", participants: ["a", "b"], percents: { a: 7000, b: 3000 } });
    assert.deepEqual(ok.expenses[0]!.shares, { a: 700, b: 300 });
  });
  it("montos exactos deben sumar el total; partes en 0 no se guardan", () => {
    const g = base();
    assert.throws(() => addExpense(g, { description: "x", amount: 1000, paidBy: "a", mode: "exact", participants: ["a", "b"], exacts: { a: 600, b: 300 } }));
    const ok = addExpense(g, { description: "x", amount: 1000, paidBy: "a", mode: "exact", participants: ["a", "b", "c"], exacts: { a: 1000, b: 0, c: 0 } });
    assert.deepEqual(ok.expenses[0]!.shares, { a: 1000 });
  });
  it("valida datos del gasto", () => {
    const g = base();
    assert.throws(() => addExpense(g, { description: "", amount: 1, paidBy: "a", mode: "equal", participants: ["a"] }));
    assert.throws(() => addExpense(g, { description: "x", amount: 0, paidBy: "a", mode: "equal", participants: ["a"] }));
    assert.throws(() => addExpense(g, { description: "x", amount: 1.5, paidBy: "a", mode: "equal", participants: ["a"] }));
    assert.throws(() => addExpense(g, { description: "x", amount: 1, paidBy: "zz", mode: "equal", participants: ["a"] }));
    assert.throws(() => addExpense(g, { description: "x", amount: 1, paidBy: "a", mode: "equal", participants: [] }));
  });
  it("borrar un gasto devuelve los saldos a 0", () => {
    let g = base();
    g = addExpense(g, { description: "Cena", amount: 90000, paidBy: "a", mode: "equal", participants: ["a", "b", "c"] }, "e1");
    g = removeExpense(g, "e1");
    assert.deepEqual(summarize(g).transfers, []);
  });
});

describe("persistencia y exportación", () => {
  it("parseState valida forma y corrige activeId", () => {
    assert.equal(parseState(null), null);
    assert.equal(parseState({ version: 2, groups: [] }), null);
    assert.equal(parseState({ version: 1, groups: [{ id: 1 }] }), null);
    const g = base();
    const st = parseState({ version: 1, groups: [g], activeId: "no-existe" });
    assert.equal(st?.activeId, "g1");
    assert.deepEqual(parseState(JSON.parse(JSON.stringify(emptyState()))), emptyState());
  });
  it("rechaza montos corruptos (no enteros)", () => {
    const g = base();
    const bad = { ...g, expenses: [{ id: "e", description: "x", paidBy: "a", amount: 1.5, date: "d", mode: "equal", shares: {} }] };
    assert.equal(parseState({ version: 1, groups: [bad], activeId: "g1" }), null);
  });
  it("CSV escapa comillas y respeta decimales", () => {
    let g = base();
    g = addExpense(g, { description: 'Pizza "grande"', amount: 12050, paidBy: "a", mode: "equal", participants: ["a", "b"] }, "e1");
    const csv = toCsv(g, 2);
    assert.match(csv, /"Pizza ""grande"""/);
    assert.match(csv, /120\.50/);
  });
  it("equalPercents suma 10000", () => {
    const p = equalPercents(["a", "b", "c"]);
    assert.equal(Object.values(p).reduce((x, y) => x + y, 0), 10000);
  });
  it("registrar un pago salda la deuda y no cuenta como gasto", () => {
    let g = addExpense(base(), { description: "Cena", amount: 90000, paidBy: "a", mode: "equal", participants: ["a", "b", "c"] }, "e1");
    assert.equal(summarize(g).transfers.length, 2);
    g = recordPayment(g, "b", "a", 30000, "2026-11-05", "p1");
    const s2 = summarize(g);
    assert.deepEqual(s2.transfers.map((t) => [t.from, t.to, t.amount]), [["c", "a", 30000]]);
    assert.equal(s2.total, 90000);
    g = recordPayment(g, "c", "a", 30000, "2026-11-05", "p2");
    assert.equal(summarize(g).transfers.length, 0);
    assert.throws(() => recordPayment(g, "a", "a", 1));
    assert.throws(() => recordPayment(g, "a", "b", 0));
    assert.throws(() => recordPayment(g, "a", "zz", 5));
  });
  it("editar un gasto conserva lugar, fecha e id y recalcula saldos", () => {
    let g = base();
    g = addExpense(g, { description: "Cena", amount: 90000, paidBy: "a", mode: "equal", participants: ["a", "b", "c"], date: "2026-11-01" }, "e1");
    g = addExpense(g, { description: "Taxi", amount: 6000, paidBy: "b", mode: "equal", participants: ["a", "b"], date: "2026-11-02" }, "e2");
    g = updateExpense(g, "e1", { description: "Cena grande", amount: 120000, paidBy: "c", mode: "equal", participants: ["a", "b", "c"], category: "Comida" });
    assert.deepEqual(g.expenses.map((e) => e.id), ["e2", "e1"]);
    assert.equal(g.expenses[1]!.date, "2026-11-01");
    assert.equal(g.expenses[1]!.category, "Comida");
    assert.equal(summarize(g).balances["c"], 80000);
    assert.throws(() => updateExpense(g, "nope", { description: "x", amount: 1, paidBy: "a", mode: "equal", participants: ["a"] }));
    assert.throws(() => updateExpense(g, "e1", { description: "", amount: 1, paidBy: "a", mode: "equal", participants: ["a"] }));
  });
  it("totales por persona y por categoría ignoran los pagos; el resumen se puede compartir", () => {
    let g = addExpense(base(), { description: "Cena", amount: 90000, paidBy: "a", mode: "equal", participants: ["a", "b", "c"], category: "Comida" }, "e1");
    g = addExpense(g, { description: "Taxi", amount: 9000, paidBy: "b", mode: "equal", participants: ["a", "b", "c"], category: "Transporte" }, "e2");
    g = recordPayment(g, "b", "a", 10000, "2026-11-05", "p1");
    const per = byPerson(g);
    assert.deepEqual(per.map((p) => [p.id, p.paid, p.consumed]), [["a", 90000, 33000], ["b", 9000, 33000], ["c", 0, 33000]]);
    assert.deepEqual(byCategory(g), [{ category: "Comida", total: 90000 }, { category: "Transporte", total: 9000 }]);
    const t = summaryText(g, (m) => `$${m}`);
    assert.match(t, /Total gastado: \$99000/);
    assert.match(t, /paga a/);
    assert.match(t, /\*Viaje\*/);
  });
});
