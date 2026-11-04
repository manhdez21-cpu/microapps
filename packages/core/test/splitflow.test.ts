import { describe, it } from "node:test";
import { expect } from "./expect.ts";
import {
  computeBalances,
  settle,
  splitByPercent,
  splitEqual,
  splitExact,
  type Expense,
  type Transfer,
} from "../src/index.ts";

function applyTransfers(b: Record<string, number>, ts: Transfer[]) {
  const out = { ...b };
  for (const t of ts) {
    out[t.from] = (out[t.from] ?? 0) + t.amount;
    out[t.to] = (out[t.to] ?? 0) - t.amount;
  }
  return out;
}

describe("splits", () => {
  it("equitativo con resto determinista", () => {
    expect(splitEqual(100, ["a", "b", "c"])).toEqual({ a: 34, b: 33, c: 33 });
  });
  it("porcentajes en bps", () => {
    expect(splitByPercent(1000, { a: 7000, b: 3000 })).toEqual({ a: 700, b: 300 });
    expect(() => splitByPercent(1000, { a: 5000, b: 4000 })).toThrow();
  });
  it("montos exactos", () => {
    expect(splitExact(100, { a: 60, b: 40 })).toEqual({ a: 60, b: 40 });
    expect(() => splitExact(100, { a: 60, b: 30 })).toThrow();
  });
  it("rechaza duplicados", () => {
    expect(() => splitEqual(100, ["a", "a"])).toThrow();
  });
});

describe("balances y liquidación", () => {
  const expenses: Expense[] = [
    { id: "1", paidBy: "ana", amount: 9000, shares: splitEqual(9000, ["ana", "beto", "caro"]) },
    { id: "2", paidBy: "beto", amount: 3000, shares: splitEqual(3000, ["ana", "beto"]) },
  ];
  it("calcula saldos que suman 0", () => {
    const b = computeBalances(expenses);
    expect(b).toEqual({ ana: 9000 - 3000 - 1500, beto: 3000 - 3000 - 1500, caro: -3000 });
    expect(Object.values(b).reduce((x, y) => x + y, 0)).toBe(0);
  });
  it("liquida dejando todos en 0 con ≤ n−1 pagos", () => {
    const b = computeBalances(expenses);
    const ts = settle(b);
    expect(ts.length).toBeLessThanOrEqual(2);
    expect(Object.values(applyTransfers(b, ts)).every((v) => v === 0)).toBe(true);
  });
  it("detecta gasto inconsistente", () => {
    expect(() => computeBalances([{ id: "x", paidBy: "a", amount: 100, shares: { a: 50 } }])).toThrow();
  });
  it("rechaza saldos que no suman 0", () => {
    expect(() => settle({ a: 10, b: -5 })).toThrow();
  });
  it("sin deudas → sin transferencias", () => {
    expect(settle({ a: 0, b: 0 })).toEqual([]);
  });
  it("propiedad: 500 escenarios aleatorios liquidan exacto y respetan cota n−1", () => {
    let s = 987654;
    const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    for (let k = 0; k < 500; k++) {
      const n = 2 + Math.floor(rnd() * 6);
      const people = Array.from({ length: n }, (_, i) => `p${i}`);
      const exps: Expense[] = [];
      const m = 1 + Math.floor(rnd() * 10);
      for (let j = 0; j < m; j++) {
        const amount = 1 + Math.floor(rnd() * 100000);
        const participants = people.filter(() => rnd() > 0.3);
        const part = participants.length > 0 ? participants : [people[0]!];
        exps.push({
          id: `e${j}`,
          paidBy: people[Math.floor(rnd() * n)]!,
          amount,
          shares: splitEqual(amount, part),
        });
      }
      const b = computeBalances(exps);
      const ts = settle(b);
      const nonZero = Object.values(b).filter((v) => v !== 0).length;
      expect(ts.length).toBeLessThanOrEqual(Math.max(0, nonZero - 1));
      expect(Object.values(applyTransfers(b, ts)).every((v) => v === 0)).toBe(true);
      expect(ts.every((t) => t.amount > 0 && t.from !== t.to)).toBe(true);
    }
  });
});
