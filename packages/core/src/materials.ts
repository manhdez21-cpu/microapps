/**
 * Calculadora de materiales. Unidades SI: metros y m².
 * Los resultados incluyen las fórmulas aplicadas para que sean verificables.
 */

const EPS = 1e-9;

/** ceil tolerante al ruido de coma flotante (p. ej. 3.0000000000000004 → 3). */
export function ceilSafe(x: number): number {
  return Math.ceil(x - EPS);
}

function positive(n: number, label: string): void {
  if (!Number.isFinite(n) || n <= 0) throw new RangeError(`${label} debe ser un número > 0`);
}

export interface Room {
  lengthM: number;
  widthM: number;
}

export function rectArea(r: Room): number {
  positive(r.lengthM, "largo");
  positive(r.widthM, "ancho");
  return r.lengthM * r.widthM;
}

export function rectPerimeter(r: Room): number {
  positive(r.lengthM, "largo");
  positive(r.widthM, "ancho");
  return 2 * (r.lengthM + r.widthM);
}

export interface TileInput {
  areaM2: number;
  tileLengthM: number;
  tileWidthM: number;
  /** Ancho de junta/boquilla en metros (0 si no aplica) */
  groutM?: number;
  /** Desperdicio en porcentaje entero (10 = 10 %) */
  wastePercent: number;
  /** Piezas por caja (opcional) */
  piecesPerBox?: number;
}

export interface TileResult {
  tilesNet: number;
  tilesWithWaste: number;
  boxes?: number;
  /** Piezas sobrantes tras comprar cajas completas, respecto a las necesarias con desperdicio */
  leftoverPieces?: number;
  formulas: string[];
}

export function tilesNeeded(i: TileInput): TileResult {
  positive(i.areaM2, "área");
  positive(i.tileLengthM, "largo de pieza");
  positive(i.tileWidthM, "ancho de pieza");
  const grout = i.groutM ?? 0;
  if (!Number.isFinite(grout) || grout < 0) throw new RangeError("junta inválida");
  if (!Number.isFinite(i.wastePercent) || i.wastePercent < 0) throw new RangeError("desperdicio inválido");

  const unitArea = (i.tileLengthM + grout) * (i.tileWidthM + grout);
  const tilesNet = ceilSafe(i.areaM2 / unitArea);
  const tilesWithWaste = ceilSafe((i.areaM2 / unitArea) * (1 + i.wastePercent / 100));
  const formulas = [
    `área por pieza con junta = (${i.tileLengthM} + ${grout}) × (${i.tileWidthM} + ${grout}) = ${unitArea} m²`,
    `piezas netas = ⌈${i.areaM2} / ${unitArea}⌉ = ${tilesNet}`,
    `piezas con ${i.wastePercent} % de desperdicio = ⌈${i.areaM2} / ${unitArea} × ${1 + i.wastePercent / 100}⌉ = ${tilesWithWaste}`,
  ];
  const result: TileResult = { tilesNet, tilesWithWaste, formulas };
  if (i.piecesPerBox !== undefined) {
    if (!Number.isInteger(i.piecesPerBox) || i.piecesPerBox <= 0) {
      throw new RangeError("piezas por caja debe ser entero > 0");
    }
    const boxes = Math.ceil(tilesWithWaste / i.piecesPerBox);
    result.boxes = boxes;
    result.leftoverPieces = boxes * i.piecesPerBox - tilesWithWaste;
    formulas.push(`cajas = ⌈${tilesWithWaste} / ${i.piecesPerBox}⌉ = ${boxes}`);
  }
  return result;
}

export interface PaintInput {
  areaM2: number;
  coats: number;
  /** Rendimiento del fabricante en m² por litro por mano (configurable) */
  coverageM2PerLiter: number;
  /** Desperdicio en porcentaje */
  wastePercent?: number;
}

export interface PaintResult {
  liters: number;
  formulas: string[];
}

export function paintNeeded(i: PaintInput): PaintResult {
  positive(i.areaM2, "área");
  positive(i.coverageM2PerLiter, "rendimiento");
  if (!Number.isInteger(i.coats) || i.coats <= 0) throw new RangeError("manos debe ser entero > 0");
  const waste = i.wastePercent ?? 0;
  if (!Number.isFinite(waste) || waste < 0) throw new RangeError("desperdicio inválido");
  const raw = (i.areaM2 * i.coats) / i.coverageM2PerLiter;
  const liters = Math.round(raw * (1 + waste / 100) * 100) / 100;
  return {
    liters,
    formulas: [`litros = ${i.areaM2} m² × ${i.coats} manos / ${i.coverageM2PerLiter} m²/L × ${1 + waste / 100} = ${liters} L`],
  };
}

/** Conversiones de longitud/área comunes (exactas por definición). */
export const convert = {
  ftToM: (ft: number) => ft * 0.3048,
  mToFt: (m: number) => m / 0.3048,
  inToM: (inch: number) => inch * 0.0254,
  sqftToM2: (sqft: number) => sqft * 0.09290304,
  m2ToSqft: (m2: number) => m2 / 0.09290304,
} as const;
