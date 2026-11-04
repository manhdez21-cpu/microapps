import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { compute, type Form } from "../src/calc.ts";
import { marginBpsToMarkupBps } from "../../../packages/core/src/index.ts";

const base: Form = { currency: "COP", materials: "", hours: "", rate: "", transport: "", overhead: "", commissionPct: "", goal: "margin", goalPct: "20", taxPct: "" };

describe("PriceRight compute", () => {
  it("materiales 80.000 con margen 20 % → precio 100.000", () => {
    const o = compute({ ...base, materials: "80.000" });
    assert.ok(o.ok);
    assert.equal(o.result.netPrice, 100000);
    assert.equal(o.result.profit, 20000);
    assert.equal(o.markupBps, 2500);
  });
  it("mano de obra: 2,5 h a 20.000 = 50.000", () => {
    const o = compute({ ...base, hours: "2,5", rate: "20.000" });
    assert.ok(o.ok);
    assert.equal(o.direct, 50000);
  });
  it("objetivo por recargo 25 % equivale a margen 20 %", () => {
    const o = compute({ ...base, materials: "80.000", goal: "markup", goalPct: "25" });
    assert.ok(o.ok);
    assert.equal(o.marginBps, 2000);
    assert.equal(o.result.netPrice, 100000);
  });
  it("impuesto configurable; vacío = 0", () => {
    const o = compute({ ...base, materials: "80.000", taxPct: "19" });
    assert.ok(o.ok);
    assert.equal(o.result.tax, 19000);
    assert.equal(o.result.grossPrice, 119000);
    const o2 = compute({ ...base, materials: "80.000" });
    assert.ok(o2.ok && o2.result.tax === 0);
  });
  it("errores claros", () => {
    assert.equal(compute(base).ok, false);
    const a = compute({ ...base, materials: "100", goalPct: "" });
    assert.ok(!a.ok && /margen/.test(a.error));
    const b = compute({ ...base, materials: "100", goalPct: "70", commissionPct: "30" });
    assert.ok(!b.ok && /menor que 100/.test(b.error));
    const c = compute({ ...base, materials: "100", hours: "1,55", rate: "1" });
    assert.ok(!c.ok && /horas/.test(c.error));
  });
  it("USD con decimales", () => {
    const o = compute({ ...base, currency: "USD", materials: "40,00" });
    assert.ok(o.ok);
    assert.equal(o.result.netPrice, 5000);
  });
});

describe("contenido SEO verificable", () => {
  it("la tabla margen↔recargo de la página coincide con el núcleo", () => {
    const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
    for (const m of [1000, 2000, 3000, 4000, 5000]) {
      const mk = marginBpsToMarkupBps(m);
      const row = `<td>${(m / 100).toFixed(0)} %</td><td>${(mk / 100).toFixed(2).replace(".", ",")} %</td>`;
      assert.ok(html.includes(row), `falta fila ${row}`);
    }
  });
});
