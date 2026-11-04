import { describe, it } from "node:test";
import { expect } from "../../../packages/core/test/expect.ts";
import { addMovement, closeDay, emptyDraft, parseDraft, parseHistory, removeMovement, toCsv } from "../src/state.ts";

describe("caja clara", () => {
  const base = () => {
    let d = { ...emptyDraft("COP"), opening: 50000 };
    d = addMovement(d, "cash_sale", 100000, "");
    d = addMovement(d, "credit_sale", 40000, "Don Pedro");
    d = addMovement(d, "expense_cash", 15000, "hielo");
    return d;
  };
  it("el fiado no entra a caja", () => {
    const c = closeDay(base(), 135000, "2026-11-04", "a");
    expect(c.result.expectedCash).toBe(135000);
    expect(c.result.difference).toBe(0);
    expect(c.result.totals.totalSales).toBe(140000);
  });
  it("faltante y sobrante con signo", () => {
    expect(closeDay(base(), 130000, "2026-11-04", "a").result.difference).toBe(-5000);
    expect(closeDay(base(), 140000, "2026-11-04", "a").result.difference).toBe(5000);
  });
  it("rechaza montos inválidos y quita movimientos", () => {
    expect(() => addMovement(emptyDraft(), "cash_sale", 0, "")).toThrow();
    expect(() => addMovement(emptyDraft(), "cash_sale", 1.5, "")).toThrow();
    const d = removeMovement(base(), "2");
    expect(d.movements.length).toBe(2);
  });
  it("csv escapa comillas y usa unidades menores", () => {
    const csv = toCsv([closeDay(base(), 130000, "2026-11-04", "a")]);
    expect(csv.split("\n").length).toBe(2);
    expect(csv.includes('"-5000"')).toBe(true);
  });
  it("parseHistory descarta basura y recalcula", () => {
    const good = JSON.parse(JSON.stringify([closeDay(base(), 135000, "2026-11-04", "a")]));
    good[0].result.expectedCash = 1; // dato manipulado: se recalcula
    const out = parseHistory([...good, { id: 5 }, null]);
    expect(out?.length).toBe(1);
    expect(out?.[0].result.expectedCash).toBe(135000);
    expect(parseHistory({})).toBe(null);
    expect(parseDraft({ currency: "COP", movements: [{ id: "1", type: "x", amount: 1 }], nextId: 2, opening: 0 })).toBe(null);
  });
});
