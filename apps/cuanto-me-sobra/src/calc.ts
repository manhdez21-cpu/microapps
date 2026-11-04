import { paintNeeded, rectArea, rectPerimeter, tilesNeeded } from "../../../packages/core/src/index.ts";
import { parseDecimal } from "../../../packages/ui/src/format.ts";

export interface TileForm {
  roomLength: string; // m
  roomWidth: string; // m
  tileLength: string; // cm
  tileWidth: string; // cm
  grout: string; // mm
  waste: string; // %
  perBox: string; // piezas, opcional
}
export interface PaintForm {
  roomLength: string; // m
  roomWidth: string; // m
  height: string; // m
  openings: string; // m², opcional
  ceiling: boolean;
  coats: string;
  coverage: string; // m² por litro por mano (etiqueta)
  waste: string; // %
}

export type TileOutcome =
  | { ok: true; area: number; tilesNet: number; tilesWithWaste: number; boxes?: number; leftover?: number; formulas: string[] }
  | { ok: false; error: string };
export type PaintOutcome = { ok: true; area: number; liters: number; formulas: string[] } | { ok: false; error: string };

const num = (t: string, label: string): number | string => {
  const v = parseDecimal(t);
  return v === null || v <= 0 ? `Revisa ${label}: escribe un número mayor que 0.` : v;
};
const opt = (t: string, label: string): number | string => (t.trim() === "" ? 0 : (parseDecimal(t) ?? `Revisa ${label}: escribe un número o déjalo vacío.`));

export function computeTiles(f: TileForm): TileOutcome {
  const l = num(f.roomLength, "el largo de la habitación"); if (typeof l === "string") return { ok: false, error: l };
  const w = num(f.roomWidth, "el ancho de la habitación"); if (typeof w === "string") return { ok: false, error: w };
  const tl = num(f.tileLength, "el largo de la pieza"); if (typeof tl === "string") return { ok: false, error: tl };
  const tw = num(f.tileWidth, "el ancho de la pieza"); if (typeof tw === "string") return { ok: false, error: tw };
  const grout = opt(f.grout, "la junta"); if (typeof grout === "string") return { ok: false, error: grout };
  const waste = opt(f.waste, "el desperdicio"); if (typeof waste === "string") return { ok: false, error: waste };
  const box = opt(f.perBox, "las piezas por caja"); if (typeof box === "string") return { ok: false, error: box };
  if (box !== 0 && !Number.isInteger(box)) return { ok: false, error: "Las piezas por caja deben ser un número entero." };

  const area = rectArea({ lengthM: l, widthM: w });
  const r = tilesNeeded({
    areaM2: area, tileLengthM: tl / 100, tileWidthM: tw / 100, groutM: grout / 1000, wastePercent: waste,
    ...(box > 0 ? { piecesPerBox: box } : {}),
  });
  const base = { ok: true as const, area, tilesNet: r.tilesNet, tilesWithWaste: r.tilesWithWaste, formulas: [`Área = ${l} m × ${w} m = ${area} m²`, ...r.formulas] };
  return r.boxes !== undefined ? { ...base, boxes: r.boxes, leftover: r.leftoverPieces ?? 0 } : base;
}

export function computePaint(f: PaintForm): PaintOutcome {
  const l = num(f.roomLength, "el largo"); if (typeof l === "string") return { ok: false, error: l };
  const w = num(f.roomWidth, "el ancho"); if (typeof w === "string") return { ok: false, error: w };
  const hgt = num(f.height, "la altura"); if (typeof hgt === "string") return { ok: false, error: hgt };
  const openings = opt(f.openings, "puertas y ventanas"); if (typeof openings === "string") return { ok: false, error: openings };
  const coats = num(f.coats, "las manos"); if (typeof coats === "string") return { ok: false, error: coats };
  if (!Number.isInteger(coats)) return { ok: false, error: "Las manos deben ser un número entero." };
  const cov = num(f.coverage, "el rendimiento (m² por litro)"); if (typeof cov === "string") return { ok: false, error: cov };
  const waste = opt(f.waste, "el desperdicio"); if (typeof waste === "string") return { ok: false, error: waste };

  const walls = rectPerimeter({ lengthM: l, widthM: w }) * hgt;
  const ceiling = f.ceiling ? rectArea({ lengthM: l, widthM: w }) : 0;
  const area = walls + ceiling - openings;
  if (area <= 0) return { ok: false, error: "Las puertas y ventanas no pueden ser mayores que la superficie a pintar." };
  const r = paintNeeded({ areaM2: area, coats, coverageM2PerLiter: cov, wastePercent: waste });
  return {
    ok: true, area: Math.round(area * 100) / 100, liters: r.liters,
    formulas: [
      `Paredes = perímetro ${rectPerimeter({ lengthM: l, widthM: w })} m × altura ${hgt} m = ${Math.round(walls * 100) / 100} m²`,
      ...(f.ceiling ? [`Techo = ${l} m × ${w} m = ${Math.round(ceiling * 100) / 100} m²`] : []),
      ...(openings > 0 ? [`Menos puertas y ventanas = ${openings} m²`] : []),
      ...r.formulas,
    ],
  };
}
