import { laborCost, markupBpsToMarginBps, priceFromCosts, type PriceResult } from "../../../packages/core/src/index.ts";
import { currencyDigits, parseAmount, parsePercentToBps } from "../../../packages/ui/src/format.ts";

export interface Form {
  currency: string;
  materials: string;
  hours: string;
  rate: string;
  transport: string;
  overhead: string;
  commissionPct: string;
  goal: "margin" | "markup";
  goalPct: string;
  taxPct: string;
}

export type Outcome =
  | { ok: true; result: PriceResult; marginBps: number; markupBps: number; commissionBps: number; taxBps: number; direct: number; formulas: string[] }
  | { ok: false; error: string };

const fail = (error: string): Outcome => ({ ok: false, error });

function optional(text: string, digits: number, label: string): number | string {
  if (text.trim() === "") return 0;
  const v = parseAmount(text, digits);
  return v === null ? `Revisa ${label}: escribe un monto mayor que 0 o déjalo vacío.` : v;
}

function parseTenths(text: string): number | null {
  const s = text.trim().replace(",", ".");
  if (s === "") return 0;
  if (!/^\d+(\.\d)?$/.test(s)) return null;
  return Math.round(Number(s) * 10);
}

export function compute(f: Form): Outcome {
  const d = currencyDigits(f.currency);
  const mat = optional(f.materials, d, "los materiales");
  if (typeof mat === "string") return fail(mat);
  const transport = optional(f.transport, d, "el transporte");
  if (typeof transport === "string") return fail(transport);
  const overhead = optional(f.overhead, d, "los costos indirectos");
  if (typeof overhead === "string") return fail(overhead);
  const rate = optional(f.rate, d, "la tarifa por hora");
  if (typeof rate === "string") return fail(rate);
  const tenths = parseTenths(f.hours);
  if (tenths === null) return fail("Revisa las horas: usa a lo sumo un decimal, por ejemplo 1,5.");
  const labor = laborCost(tenths, rate);

  const direct = mat + transport + labor;
  if (direct + overhead <= 0) return fail("Añade al menos un costo (materiales, mano de obra, transporte o indirectos).");

  const commissionBps = f.commissionPct.trim() === "" ? 0 : parsePercentToBps(f.commissionPct);
  if (commissionBps === null) return fail("Revisa la comisión: un porcentaje entre 0 y 100.");
  const taxBps = f.taxPct.trim() === "" ? 0 : parsePercentToBps(f.taxPct, 100000);
  if (taxBps === null) return fail("Revisa el impuesto: un porcentaje válido.");

  if (f.goalPct.trim() === "") return fail(f.goal === "margin" ? "Escribe el margen que quieres ganar." : "Escribe el recargo que quieres aplicar.");
  const goalBps = parsePercentToBps(f.goalPct, f.goal === "markup" ? 1_000_000 : 9999);
  if (goalBps === null) return fail(f.goal === "margin" ? "El margen debe estar entre 0 y 99,99 %." : "Revisa el recargo.");
  const marginBps = f.goal === "margin" ? goalBps : markupBpsToMarginBps(goalBps);
  if (marginBps + commissionBps >= 10000) return fail("El margen más la comisión debe ser menor que 100 %.");

  const result = priceFromCosts({ directCosts: direct, overheadCosts: overhead, targetMarginBps: marginBps, commissionBps, taxBps });
  const pct = (b: number) => `${(b / 100).toFixed(2).replace(".", ",")} %`;
  const formulas = [
    `Costo total = materiales + mano de obra + transporte + indirectos`,
    `Precio sin impuesto = costo total ÷ (1 − margen − comisión) = costo ÷ (1 − ${pct(marginBps)} − ${pct(commissionBps)})`,
    `Ganancia = precio − costo − comisión`,
    `Recargo equivalente = ganancia ÷ costo = ${pct(result.actualMarkupBps)}`,
  ];
  return { ok: true, result, marginBps, markupBps: result.actualMarkupBps, commissionBps, taxBps, direct, formulas };
}
