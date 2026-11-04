import { describe, it } from "node:test";
import { expect } from "../../../packages/core/test/expect.ts";
import { parseDecimal } from "../../../packages/ui/src/format.ts";
import { compute, FACTORS } from "../src/calc.ts";

const p = parseDecimal;
describe("huella al día", () => {
  it("factores derivados de la EIA", () => {
    const g = FACTORS.find((f) => f.id === "gasoline")!.kgPerUnit!;
    expect(g > 2.24 && g < 2.25).toBe(true);
    const d = FACTORS.find((f) => f.id === "diesel")!.kgPerUnit!;
    expect(d > 2.69 && d < 2.70).toBe(true);
    const n = FACTORS.find((f) => f.id === "gas")!.kgPerUnit!;
    expect(n > 1.93 && n < 1.94).toBe(true);
  });
  it("la electricidad exige factor", () => {
    const o = compute({ elec: "150" }, {}, p);
    expect(o.ok).toBe(false);
  });
  it("suma líneas y anualiza", () => {
    const o = compute({ elec: "100", gasoline: "40" }, { elec: "0,2" }, p);
    if (!o.ok) throw new Error(o.error);
    expect(Math.round(o.lines[0].kgMonth * 100) / 100).toBe(20);
    expect(Math.abs(o.kgMonth - (20 + 40 * FACTORS[1].kgPerUnit!)) < 1e-9).toBe(true);
    expect(Math.abs(o.kgYear - o.kgMonth * 12) < 1e-9).toBe(true);
  });
  it("valida entradas", () => {
    expect(compute({}, {}, p).ok).toBe(false);
    expect(compute({ gasoline: "-3" }, {}, p).ok).toBe(false);
    expect(compute({ gasoline: "abc" }, {}, p).ok).toBe(false);
    expect(compute({ gasoline: "10" }, { gasoline: "x" }, p).ok).toBe(false);
    expect(compute({ gasoline: "0" }, {}, p).ok).toBe(true);
  });
});
