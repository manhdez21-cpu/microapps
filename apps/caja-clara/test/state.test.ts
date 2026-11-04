import { describe, it } from "node:test";
import { expect } from "../../../packages/core/test/expect.ts";
import { creditByClient, salesByDay, addMovement, closeDay, emptyDraft, parseDraft, parseHistory, periodRange, removeMovement, report, toCsv } from "../src/state.ts";

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
  it("rangos de día, semana (lunes a domingo) y mes", () => {
    expect(periodRange("day", "2026-11-04")).toEqual({ from: "2026-11-04", to: "2026-11-04" });
    expect(periodRange("week", "2026-11-04")).toEqual({ from: "2026-11-02", to: "2026-11-08" });
    expect(periodRange("week", "2026-11-08")).toEqual({ from: "2026-11-02", to: "2026-11-08" });
    expect(periodRange("week", "2026-11-02")).toEqual({ from: "2026-11-02", to: "2026-11-08" });
    expect(periodRange("month", "2024-02-10")).toEqual({ from: "2024-02-01", to: "2024-02-29" });
    expect(() => periodRange("day", "x")).toThrow();
  });
  it("reporte suma cierres del rango y de una sola moneda", () => {
    const days = [closeDay(base(), 135000, "2026-11-03", "a"), closeDay(base(), 130000, "2026-11-04", "b"), closeDay(base(), 140000, "2026-11-20", "c"), closeDay({ ...base(), currency: "USD" }, 135000, "2026-11-04", "d")];
    const w = report(days, "COP", "2026-11-02", "2026-11-08");
    expect([w.days, w.sales, w.cash, w.credit, w.expenses, w.difference, w.short, w.over, w.even]).toEqual([2, 280000, 200000, 80000, 30000, -5000, 5000, 0, 1]);
    const m = report(days, "COP", "2026-11-01", "2026-11-30");
    expect([m.days, m.difference, m.over]).toEqual([3, 0, 5000]);
    expect(report(days, "COP", "2027-01-01", "2027-01-31").days).toBe(0);
  });
  it("fiados por cliente: ventas fiadas menos cobros, sin mezclar monedas", () => {
    let d = emptyDraft("COP");
    d = addMovement(d, "credit_sale", 40000, "Don Pedro");
    d = addMovement(d, "credit_sale", 20000, "don  pedro");
    d = addMovement(d, "credit_payment_cash", 25000, "Don Pedro");
    d = addMovement(d, "credit_sale", 10000, "Lucía");
    d = addMovement(d, "credit_sale", 5000, "");
    d = addMovement(d, "cash_sale", 99999, "ignorado");
    const closed = closeDay({ ...emptyDraft("COP"), movements: [{ id: "1", type: "credit_sale", amount: 8000, note: "Lucía" }] }, 0, "2026-11-01", "x");
    const usd = closeDay({ ...emptyDraft("USD"), movements: [{ id: "1", type: "credit_sale", amount: 777, note: "Lucía" }] }, 0, "2026-11-01", "u");
    const r = creditByClient([closed, usd], d);
    expect(r.map((x) => [x.client, x.pending])).toEqual([["Don Pedro", 35000], ["Lucía", 18000], ["Sin nombre", 5000]]);
    const paidOff = addMovement(emptyDraft("COP"), "credit_sale", 100, "Ana");
    expect(creditByClient([], addMovement(paidOff, "credit_payment_cash", 100, "ana")).length).toBe(0);
  });
  it("ventas por día dentro del rango, ordenadas", () => {
    const days = [closeDay(base(), 135000, "2026-11-04", "b"), closeDay(base(), 135000, "2026-11-02", "a"), closeDay(base(), 135000, "2026-12-01", "c")];
    expect(salesByDay(days, "COP", "2026-11-01", "2026-11-30")).toEqual([{ date: "2026-11-02", sales: 140000 }, { date: "2026-11-04", sales: 140000 }]);
  });
});
