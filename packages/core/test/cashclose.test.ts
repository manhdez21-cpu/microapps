import { describe, it } from "node:test";
import { expect } from "./expect.ts";
import { closeCashRegister, type Movement } from "../src/index.ts";

const mv = (id: string, type: Movement["type"], amount: number): Movement => ({ id, type, amount });

describe("closeCashRegister", () => {
  it("cuadra exacto sin diferencia", () => {
    const r = closeCashRegister({
      openingCash: 50000,
      movements: [
        mv("1", "cash_sale", 100000),
        mv("2", "card_sale", 80000), // no entra a caja
        mv("3", "expense_cash", 20000),
        mv("4", "withdrawal_cash", 30000),
      ],
      countedCash: 100000,
    });
    expect(r.expectedCash).toBe(100000);
    expect(r.difference).toBe(0);
    expect(r.totals.totalSales).toBe(180000);
  });
  it("la venta fiada no entra a caja pero su cobro en efectivo sí", () => {
    const r = closeCashRegister({
      openingCash: 0,
      movements: [mv("1", "credit_sale", 40000), mv("2", "credit_payment_cash", 15000)],
      countedCash: 15000,
    });
    expect(r.expectedCash).toBe(15000);
    expect(r.totals.creditSales).toBe(40000);
    expect(r.difference).toBe(0);
  });
  it("faltante es negativo y sobrante positivo", () => {
    const base = { openingCash: 10000, movements: [mv("1", "cash_sale", 5000)] };
    expect(closeCashRegister({ ...base, countedCash: 14000 }).difference).toBe(-1000);
    expect(closeCashRegister({ ...base, countedCash: 16000 }).difference).toBe(1000);
  });
  it("transferencias no afectan el efectivo esperado", () => {
    const r = closeCashRegister({ openingCash: 1000, movements: [mv("1", "transfer_sale", 99999)], countedCash: 1000 });
    expect(r.expectedCash).toBe(1000);
  });
  it("rechaza ids duplicados, montos ≤ 0 y no enteros", () => {
    expect(() =>
      closeCashRegister({ openingCash: 0, movements: [mv("1", "cash_sale", 1), mv("1", "cash_sale", 1)], countedCash: 0 }),
    ).toThrow();
    expect(() => closeCashRegister({ openingCash: 0, movements: [mv("1", "cash_sale", 0)], countedCash: 0 })).toThrow();
    expect(() => closeCashRegister({ openingCash: 0, movements: [mv("1", "cash_sale", 1.5)], countedCash: 0 })).toThrow();
  });
});
