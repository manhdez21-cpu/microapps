import { describe, it } from "node:test";
import { expect } from "./expect.ts";
import { allocate, applyBps, divRound } from "../src/index.ts";

describe("divRound", () => {
  it("redondea half-up", () => {
    expect(divRound(5, 2)).toBe(3);
    expect(divRound(4, 3)).toBe(1);
    expect(divRound(-5, 2)).toBe(-3);
    expect(divRound(0, 7)).toBe(0);
  });
  it("rechaza denominador inválido", () => {
    expect(() => divRound(1, 0)).toThrow();
  });
});

describe("applyBps", () => {
  it("calcula porcentajes en bps", () => {
    expect(applyBps(10000, 1900)).toBe(1900); // 19 % de 100,00
    expect(applyBps(1, 5000)).toBe(1); // 0,5 → 1 (half-up)
    expect(applyBps(999, 1000)).toBe(100); // 99,9 → 100
  });
});

describe("allocate", () => {
  it("reparte 100 entre 3 sin perder centavos", () => {
    const parts = allocate(100, [1, 1, 1]);
    expect(parts).toEqual([34, 33, 33]);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(100);
  });
  it("respeta pesos", () => {
    expect(allocate(1000, [1, 3])).toEqual([250, 750]);
  });
  it("maneja pesos cero y totales negativos", () => {
    expect(allocate(10, [0, 1])).toEqual([0, 10]);
    expect(allocate(-100, [1, 1, 1])).toEqual([-34, -33, -33]);
  });
  it("suma exacta en 2000 casos aleatorios (semilla fija)", () => {
    let s = 12345;
    const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    for (let k = 0; k < 2000; k++) {
      const n = 1 + Math.floor(rnd() * 8);
      const w = Array.from({ length: n }, () => Math.floor(rnd() * 100));
      if (w.reduce((a, b) => a + b, 0) === 0) w[0] = 1;
      const total = Math.floor(rnd() * 1_000_000) - 200_000;
      const parts = allocate(total, w);
      expect(parts.reduce((a, b) => a + b, 0)).toBe(total);
    }
  });
  it("rechaza entradas inválidas", () => {
    expect(() => allocate(10, [])).toThrow();
    expect(() => allocate(10, [0, 0])).toThrow();
    expect(() => allocate(1.5, [1])).toThrow();
    expect(() => allocate(10, [-1, 2])).toThrow();
  });
});
