import { paintNeeded, rectArea, rectPerimeter, tilesNeeded } from "../../../packages/core/src/index.ts";
import { currencyDigits, parseAmount, parseDecimal } from "../../../packages/ui/src/format.ts";

export interface TileForm {
  roomLength: string; // m
  roomWidth: string; // m
  tileLength: string; // cm
  tileWidth: string; // cm
  grout: string; // mm
  waste: string; // %
  perBox: string; // piezas, opcional
  /** Opcionales: otra superficie (m², p. ej. un tramo en L), precios y materiales de pega. */
  currency?: string;
  extraArea?: string;
  price?: string; // por caja (si hay piezas por caja) o por pieza
  adhesiveYield?: string; adhesiveBag?: string; adhesivePrice?: string; // kg/m², kg por bolsa, precio por bolsa
  groutYield?: string; groutBag?: string; groutPrice?: string;
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
  currency?: string;
  extraArea?: string; // m² de pared o techo adicionales
  canSize?: string; // litros por lata
  canPrice?: string;
}

export interface Item { name: string; qty: string; cost?: number }
export type TileOutcome =
  | { ok: true; area: number; tilesNet: number; tilesWithWaste: number; boxes?: number; leftover?: number; formulas: string[]; items: Item[]; totalCost?: number }
  | { ok: false; error: string };
export type PaintOutcome = { ok: true; area: number; liters: number; formulas: string[]; items: Item[]; totalCost?: number } | { ok: false; error: string };

const num = (t: string, label: string): number | string => {
  const v = parseDecimal(t);
  return v === null || v <= 0 ? `Revisa ${label}: escribe un número mayor que 0.` : v;
};
const opt = (t: string, label: string): number | string => (t.trim() === "" ? 0 : (parseDecimal(t) ?? `Revisa ${label}: escribe un número o déjalo vacío.`));

const money = (t: string | undefined, digits: number, label: string): number | string => {
  if (!t || t.trim() === "") return 0;
  const v = parseAmount(t, digits);
  return v === null ? `Revisa ${label}: escribe un precio mayor que 0 o déjalo vacío.` : v;
};
const nfmt = (n: number) => String(Math.round(n * 100) / 100).replace(".", ",");

export function computeTiles(f: TileForm): TileOutcome {
  const l = num(f.roomLength, "el largo de la habitación"); if (typeof l === "string") return { ok: false, error: l };
  const w = num(f.roomWidth, "el ancho de la habitación"); if (typeof w === "string") return { ok: false, error: w };
  const tl = num(f.tileLength, "el largo de la pieza"); if (typeof tl === "string") return { ok: false, error: tl };
  const tw = num(f.tileWidth, "el ancho de la pieza"); if (typeof tw === "string") return { ok: false, error: tw };
  const grout = opt(f.grout, "la junta"); if (typeof grout === "string") return { ok: false, error: grout };
  const waste = opt(f.waste, "el desperdicio"); if (typeof waste === "string") return { ok: false, error: waste };
  const box = opt(f.perBox, "las piezas por caja"); if (typeof box === "string") return { ok: false, error: box };
  if (box !== 0 && !Number.isInteger(box)) return { ok: false, error: "Las piezas por caja deben ser un número entero." };

  const extra = opt(f.extraArea ?? "", "la superficie adicional"); if (typeof extra === "string") return { ok: false, error: extra };
  if (extra < 0) return { ok: false, error: "La superficie adicional no puede ser negativa." };
  const d = currencyDigits(f.currency ?? "COP");
  const price = money(f.price, d, "el precio de las piezas"); if (typeof price === "string") return { ok: false, error: price };
  const aY = opt(f.adhesiveYield ?? "", "el rendimiento del adhesivo"); if (typeof aY === "string") return { ok: false, error: aY };
  const aB = opt(f.adhesiveBag ?? "", "los kg de la bolsa de adhesivo"); if (typeof aB === "string") return { ok: false, error: aB };
  const aP = money(f.adhesivePrice, d, "el precio del adhesivo"); if (typeof aP === "string") return { ok: false, error: aP };
  const gY = opt(f.groutYield ?? "", "el rendimiento de la boquilla"); if (typeof gY === "string") return { ok: false, error: gY };
  const gB = opt(f.groutBag ?? "", "los kg de la bolsa de boquilla"); if (typeof gB === "string") return { ok: false, error: gB };
  const gP = money(f.groutPrice, d, "el precio de la boquilla"); if (typeof gP === "string") return { ok: false, error: gP };
  const area = Math.round((rectArea({ lengthM: l, widthM: w }) + extra) * 100) / 100;
  const r = tilesNeeded({
    areaM2: area, tileLengthM: tl / 100, tileWidthM: tw / 100, groutM: grout / 1000, wastePercent: waste,
    ...(box > 0 ? { piecesPerBox: box } : {}),
  });
  const items: Item[] = []; let total = 0;
  const formulas = [`Área = ${l} m × ${w} m${extra > 0 ? ` + ${extra} m² adicionales` : ""} = ${nfmt(area)} m²`, ...r.formulas];
  const units = r.boxes ?? r.tilesWithWaste;
  const tileCost = price > 0 ? units * price : undefined;
  items.push({ name: r.boxes !== undefined ? "Cerámica (cajas)" : "Cerámica (piezas)", qty: String(units), ...(tileCost !== undefined ? { cost: tileCost } : {}) });
  if (tileCost !== undefined) { total += tileCost; formulas.push(`Costo cerámica = ${units} × ${price / 10 ** d} = ${tileCost / 10 ** d}`); }
  for (const [name, y, bag, pr] of [["Adhesivo", aY, aB, aP], ["Boquilla", gY, gB, gP]] as const) {
    if (y <= 0) continue;
    const kg = Math.ceil(area * y * 10) / 10;
    const bags = bag > 0 ? Math.ceil(kg / bag) : undefined;
    const cost = bags !== undefined && pr > 0 ? bags * pr : undefined;
    items.push({ name, qty: bags !== undefined ? `${bags} ${bags === 1 ? "bolsa" : "bolsas"} (${nfmt(kg)} kg)` : `${nfmt(kg)} kg`, ...(cost !== undefined ? { cost } : {}) });
    formulas.push(`${name} = ${nfmt(area)} m² × ${nfmt(y)} kg/m² = ${nfmt(kg)} kg${bags !== undefined ? ` → ${bags} de ${nfmt(bag)} kg` : ""}`);
    if (cost !== undefined) total += cost;
  }
  const base = { ok: true as const, area, tilesNet: r.tilesNet, tilesWithWaste: r.tilesWithWaste, formulas, items, ...(total > 0 ? { totalCost: total } : {}) };
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

  const extra = opt(f.extraArea ?? "", "la superficie adicional"); if (typeof extra === "string") return { ok: false, error: extra };
  if (extra < 0) return { ok: false, error: "La superficie adicional no puede ser negativa." };
  const canSize = opt(f.canSize ?? "", "los litros por lata"); if (typeof canSize === "string") return { ok: false, error: canSize };
  const canPrice = money(f.canPrice, currencyDigits(f.currency ?? "COP"), "el precio de la lata"); if (typeof canPrice === "string") return { ok: false, error: canPrice };
  const walls = rectPerimeter({ lengthM: l, widthM: w }) * hgt;
  const ceiling = f.ceiling ? rectArea({ lengthM: l, widthM: w }) : 0;
  const area = walls + ceiling + extra - openings;
  if (area <= 0) return { ok: false, error: "Las puertas y ventanas no pueden ser mayores que la superficie a pintar." };
  const r = paintNeeded({ areaM2: area, coats, coverageM2PerLiter: cov, wastePercent: waste });
  const cans = canSize > 0 ? Math.ceil(r.liters / canSize) : undefined;
  const cost = cans !== undefined && canPrice > 0 ? cans * canPrice : undefined;
  const items: Item[] = [{ name: "Pintura", qty: `${nfmt(r.liters)} L`, ...(cans === undefined ? {} : {}) }];
  if (cans !== undefined) items.push({ name: "Latas", qty: `${cans} de ${nfmt(canSize)} L`, ...(cost !== undefined ? { cost } : {}) });
  return {
    ok: true, area: Math.round(area * 100) / 100, liters: r.liters, items, ...(cost !== undefined ? { totalCost: cost } : {}),
    formulas: [
      `Paredes = perímetro ${rectPerimeter({ lengthM: l, widthM: w })} m × altura ${hgt} m = ${Math.round(walls * 100) / 100} m²`,
      ...(f.ceiling ? [`Techo = ${l} m × ${w} m = ${Math.round(ceiling * 100) / 100} m²`] : []),
      ...(openings > 0 ? [`Menos puertas y ventanas = ${openings} m²`] : []),
      ...(extra > 0 ? [`Más superficie adicional = ${extra} m²`] : []),
      ...r.formulas,
      ...(cans !== undefined ? [`Latas = ${nfmt(r.liters)} L ÷ ${nfmt(canSize)} L por lata, hacia arriba = ${cans}`] : []),
    ],
  };
}
