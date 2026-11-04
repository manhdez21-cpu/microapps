import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computePaint, computeTiles, type PaintForm, type TileForm } from "../src/calc.ts";

const tile: TileForm = { roomLength: "4", roomWidth: "3", tileLength: "50", tileWidth: "50", grout: "", waste: "10", perBox: "" };
const paint: PaintForm = { roomLength: "4", roomWidth: "3", height: "2,5", openings: "", ceiling: false, coats: "2", coverage: "10", waste: "" };

describe("cerámica", () => {
  it("12 m² con piezas de 50×50 y 10 % → 48 netas, 53 con desperdicio", () => {
    const r = computeTiles(tile);
    assert.ok(r.ok);
    assert.equal(r.area, 12);
    assert.equal(r.tilesNet, 48);
    assert.equal(r.tilesWithWaste, 53);
  });
  it("cajas y sobrantes", () => {
    const r = computeTiles({ ...tile, perBox: "8" });
    assert.ok(r.ok && r.boxes === 7 && r.leftover === 3);
  });
  it("acepta comas decimales y junta en mm", () => {
    const r = computeTiles({ ...tile, roomLength: "4,2", grout: "3" });
    assert.ok(r.ok);
  });
  it("errores claros", () => {
    const a = computeTiles({ ...tile, roomLength: "" });
    assert.ok(!a.ok && /largo de la habitación/.test(a.error));
    const b = computeTiles({ ...tile, perBox: "7,5" });
    assert.ok(!b.ok && /entero/.test(b.error));
  });
});

describe("pintura", () => {
  it("paredes: perímetro 14 × 2,5 = 35 m²; 2 manos a 10 m²/L → 7 L", () => {
    const r = computePaint(paint);
    assert.ok(r.ok);
    assert.equal(r.area, 35);
    assert.equal(r.liters, 7);
  });
  it("techo y aberturas", () => {
    const r = computePaint({ ...paint, ceiling: true, openings: "4" });
    assert.ok(r.ok);
    assert.equal(r.area, 35 + 12 - 4);
  });
  it("rendimiento es obligatorio (no se inventa)", () => {
    const r = computePaint({ ...paint, coverage: "" });
    assert.ok(!r.ok && /rendimiento/.test(r.error));
  });
  it("aberturas mayores que la superficie", () => {
    const r = computePaint({ ...paint, openings: "99" });
    assert.ok(!r.ok);
  });
  it("adhesivo, boquilla y costo total", () => {
    const r = computeTiles({ ...tile, perBox: "8", price: "90000", adhesiveYield: "4,5", adhesiveBag: "25", adhesivePrice: "42000", groutYield: "0,3", groutBag: "5", groutPrice: "18000" });
    assert.ok(r.ok);
    // 7 cajas × 90.000 + adhesivo 54 kg → 3 bolsas × 42.000 + boquilla 3,6 kg → 1 bolsa × 18.000
    assert.deepEqual(r.items.map((x) => [x.name, x.cost]), [["Cerámica (cajas)", 630000], ["Adhesivo", 126000], ["Boquilla", 18000]]);
    assert.equal(r.totalCost, 774000);
    assert.ok(r.items[1]!.qty.startsWith("3 bolsas"));
  });
  it("superficie adicional suma al área y valida precios", () => {
    const r = computeTiles({ ...tile, extraArea: "6" });
    assert.ok(r.ok && r.area === 18);
    assert.equal(computeTiles({ ...tile, price: "abc" }).ok, false);
    assert.equal(computeTiles({ ...tile, extraArea: "-1" }).ok, false);
    const noCost = computeTiles(tile);
    assert.ok(noCost.ok && noCost.totalCost === undefined);
  });
});

describe("pintura con latas", () => {
  it("latas hacia arriba y costo; el área adicional suma", () => {
    const r = computePaint({ ...paint, canSize: "3,7", canPrice: "95000" });
    assert.ok(r.ok);
    // 7 litros → 2 latas de 3,7 L
    assert.deepEqual(r.items.map((x) => x.name), ["Pintura", "Latas"]);
    assert.equal(r.totalCost, 190000);
    const e = computePaint({ ...paint, extraArea: "10" });
    const base = computePaint(paint);
    assert.ok(e.ok && base.ok && e.area === base.area + 10 && e.liters > base.liters);
    assert.equal(computePaint({ ...paint, canPrice: "x" }).ok, false);
  });
});
