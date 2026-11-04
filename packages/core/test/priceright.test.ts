import { describe, it } from "node:test";
import { expect } from "./expect.ts";
import { laborCost, marginBpsToMarkupBps, markupBpsToMarginBps, priceFromCosts } from "../src/index.ts";

describe("margen vs recargo", () => {
  it("20 % de margen equivale a 25 % de recargo", () => {
    expect(marginBpsToMarkupBps(2000)).toBe(2500);
    expect(markupBpsToMarginBps(2500)).toBe(2000);
  });
  it("50 % de recargo equivale a 33,33 % de margen", () => {
    expect(markupBpsToMarginBps(5000)).toBe(3333);
  });
  it("rechaza margen ≥ 100 %", () => {
    expect(() => marginBpsToMarkupBps(10000)).toThrow();
  });
});

describe("priceFromCosts", () => {
  it("costo 80,00 con margen 20 % → precio 100,00, ganancia 20,00", () => {
    const r = priceFromCosts({ directCosts: 8000, targetMarginBps: 2000 });
    expect(r.netPrice).toBe(10000);
    expect(r.profit).toBe(2000);
    expect(r.actualMarginBps).toBe(2000);
    expect(r.actualMarkupBps).toBe(2500);
    expect(r.grossPrice).toBe(10000);
  });
  it("incluye indirectos, comisión e impuesto configurable", () => {
    const r = priceFromCosts({
      directCosts: 5000,
      overheadCosts: 1000,
      targetMarginBps: 2000,
      commissionBps: 500,
      taxBps: 1900,
    });
    // denom = 1 − 0,20 − 0,05 = 0,75 → precio = 6000 / 0,75 = 8000
    expect(r.netPrice).toBe(8000);
    expect(r.commission).toBe(400);
    expect(r.profit).toBe(8000 - 6000 - 400);
    expect(r.tax).toBe(1520);
    expect(r.grossPrice).toBe(9520);
  });
  it("impuesto 0 por defecto (no se asumen tasas)", () => {
    expect(priceFromCosts({ directCosts: 1000, targetMarginBps: 1000 }).tax).toBe(0);
  });
  it("rechaza margen + comisión ≥ 100 %", () => {
    expect(() => priceFromCosts({ directCosts: 1, targetMarginBps: 6000, commissionBps: 4000 })).toThrow();
  });
  it("rechaza costos negativos o no enteros", () => {
    expect(() => priceFromCosts({ directCosts: -1, targetMarginBps: 1000 })).toThrow();
    expect(() => priceFromCosts({ directCosts: 1.5, targetMarginBps: 1000 })).toThrow();
  });
});

describe("laborCost", () => {
  it("1,5 h a 20.000 = 30.000", () => {
    expect(laborCost(15, 20000)).toBe(30000);
  });
});
