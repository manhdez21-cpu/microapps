import { describe, it } from "node:test";
import { expect } from "./expect.ts";
import { ceilSafe, convert, paintNeeded, rectArea, rectPerimeter, tilesNeeded } from "../src/index.ts";

describe("geometría", () => {
  it("área y perímetro", () => {
    expect(rectArea({ lengthM: 4, widthM: 3 })).toBe(12);
    expect(rectPerimeter({ lengthM: 4, widthM: 3 })).toBe(14);
  });
  it("rechaza medidas inválidas", () => {
    expect(() => rectArea({ lengthM: 0, widthM: 3 })).toThrow();
    expect(() => rectArea({ lengthM: NaN, widthM: 3 })).toThrow();
  });
  it("ceilSafe ignora ruido de float", () => {
    expect(ceilSafe(3.0000000000000004)).toBe(3);
    expect(ceilSafe(3.01)).toBe(4);
  });
});

describe("tilesNeeded", () => {
  it("12 m² con piezas de 0,5×0,5 y 10 % → 53 piezas", () => {
    const r = tilesNeeded({ areaM2: 12, tileLengthM: 0.5, tileWidthM: 0.5, wastePercent: 10 });
    expect(r.tilesNet).toBe(48);
    expect(r.tilesWithWaste).toBe(53); // 48 × 1,1 = 52,8 → 53
  });
  it("cajas y sobrantes", () => {
    const r = tilesNeeded({ areaM2: 12, tileLengthM: 0.5, tileWidthM: 0.5, wastePercent: 10, piecesPerBox: 8 });
    expect(r.boxes).toBe(7); // ⌈53/8⌉
    expect(r.leftoverPieces).toBe(7 * 8 - 53);
    expect(r.formulas.length).toBeGreaterThanOrEqual(3);
  });
  it("la junta aumenta el área por pieza", () => {
    const sin = tilesNeeded({ areaM2: 12, tileLengthM: 0.5, tileWidthM: 0.5, wastePercent: 0 });
    const con = tilesNeeded({ areaM2: 12, tileLengthM: 0.5, tileWidthM: 0.5, groutM: 0.01, wastePercent: 0 });
    // (0,5+0,01)² = 0,2601 m² → 12 / 0,2601 = 46,14 → 47 piezas
    expect(con.tilesNet).toBe(47);
    expect(con.tilesNet).toBeLessThan(sin.tilesNet);
  });
  it("rechaza piezas por caja inválidas", () => {
    expect(() =>
      tilesNeeded({ areaM2: 1, tileLengthM: 0.3, tileWidthM: 0.3, wastePercent: 5, piecesPerBox: 0 }),
    ).toThrow();
  });
});

describe("paintNeeded", () => {
  it("40 m², 2 manos, 10 m²/L, 10 % → 8,8 L", () => {
    expect(paintNeeded({ areaM2: 40, coats: 2, coverageM2PerLiter: 10, wastePercent: 10 }).liters).toBe(8.8);
  });
  it("rechaza manos no enteras", () => {
    expect(() => paintNeeded({ areaM2: 10, coats: 1.5, coverageM2PerLiter: 10 })).toThrow();
  });
});

describe("conversiones", () => {
  it("pies a metros y de vuelta", () => {
    expect(convert.ftToM(10)).toBeCloseTo(3.048, 10);
    expect(convert.mToFt(convert.ftToM(7))).toBeCloseTo(7, 10);
    expect(convert.sqftToM2(100)).toBeCloseTo(9.290304, 10);
  });
});
