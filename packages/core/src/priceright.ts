import { applyBps, assertMinor, divRound, type Minor } from "./money.ts";

/**
 * MARGEN = ganancia / precio de venta.   RECARGO (markup) = ganancia / costo.
 * Son cosas distintas: margen 20 % ≠ recargo 20 %.
 * Conversión: recargo = margen / (1 − margen);  margen = recargo / (1 + recargo).
 */
export function marginBpsToMarkupBps(marginBps: number): number {
  if (!Number.isSafeInteger(marginBps) || marginBps < 0 || marginBps >= 10000) {
    throw new RangeError("margen debe estar en [0, 10000) bps");
  }
  return divRound(marginBps * 10000, 10000 - marginBps);
}

export function markupBpsToMarginBps(markupBps: number): number {
  if (!Number.isSafeInteger(markupBps) || markupBps < 0) {
    throw new RangeError("recargo debe ser entero ≥ 0 bps");
  }
  return divRound(markupBps * 10000, 10000 + markupBps);
}

export interface PriceInput {
  /** Costos directos: materiales, mano de obra, transporte, etc. (unidades menores) */
  directCosts: Minor;
  /** Parte de costos fijos / indirectos asignada a este trabajo */
  overheadCosts?: Minor;
  /** Margen objetivo sobre el precio de venta (bps). 2000 = 20 % */
  targetMarginBps: number;
  /** Comisión de plataforma/cobro como % del precio de venta (bps). Opcional */
  commissionBps?: number;
  /** Impuesto configurable sobre el precio neto (bps). 0 por defecto; depende del país */
  taxBps?: number;
}

export interface PriceResult {
  totalCost: Minor;
  /** Precio antes de impuestos */
  netPrice: Minor;
  commission: Minor;
  tax: Minor;
  /** Precio final al cliente = neto + impuesto */
  grossPrice: Minor;
  /** Ganancia = neto − costo − comisión */
  profit: Minor;
  /** Margen real tras redondeos (bps, sobre precio neto) */
  actualMarginBps: number;
  /** Recargo real sobre costo total (bps) */
  actualMarkupBps: number;
}

export function priceFromCosts(input: PriceInput): PriceResult {
  const overhead = input.overheadCosts ?? 0;
  const commissionBps = input.commissionBps ?? 0;
  const taxBps = input.taxBps ?? 0;
  assertMinor(input.directCosts, "costos directos");
  assertMinor(overhead, "costos indirectos");
  if (input.directCosts < 0 || overhead < 0) throw new RangeError("los costos no pueden ser negativos");
  for (const [n, v] of [
    ["margen", input.targetMarginBps],
    ["comisión", commissionBps],
    ["impuesto", taxBps],
  ] as const) {
    if (!Number.isSafeInteger(v) || v < 0) throw new RangeError(`${n} debe ser entero ≥ 0 bps`);
  }
  const denom = 10000 - input.targetMarginBps - commissionBps;
  if (denom <= 0) throw new RangeError("margen + comisión debe ser < 100 %");

  const totalCost = input.directCosts + overhead;
  // precio = costo / (1 − margen − comisión)
  const netPrice = divRound(totalCost * 10000, denom);
  const commission = applyBps(netPrice, commissionBps);
  const profit = netPrice - totalCost - commission;
  const tax = applyBps(netPrice, taxBps);
  return {
    totalCost,
    netPrice,
    commission,
    tax,
    grossPrice: netPrice + tax,
    profit,
    actualMarginBps: netPrice === 0 ? 0 : divRound(profit * 10000, netPrice),
    actualMarkupBps: totalCost === 0 ? 0 : divRound(profit * 10000, totalCost),
  };
}

/** Horas × tarifa. Horas en décimas de hora (entero) para evitar floats: 15 = 1,5 h. */
export function laborCost(tenthsOfHour: number, hourlyRate: Minor): Minor {
  if (!Number.isSafeInteger(tenthsOfHour) || tenthsOfHour < 0) throw new RangeError("décimas de hora inválidas");
  assertMinor(hourlyRate, "tarifa");
  return divRound(tenthsOfHour * hourlyRate, 10);
}
