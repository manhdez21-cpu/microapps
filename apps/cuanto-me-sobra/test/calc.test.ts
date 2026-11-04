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
});
