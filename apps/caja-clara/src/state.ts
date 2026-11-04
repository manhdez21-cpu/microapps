import { closeCashRegister, type CloseResult, type Movement, type MovementType } from "../../../packages/core/src/index.ts";

export const TYPE_LABEL: Record<MovementType, string> = {
  cash_sale: "Venta en efectivo",
  card_sale: "Venta con tarjeta",
  transfer_sale: "Venta por transferencia",
  credit_sale: "Venta fiada (no entra a caja)",
  credit_payment_cash: "Cobro de fiado en efectivo",
  expense_cash: "Gasto pagado de la caja",
  withdrawal_cash: "Retiro de efectivo",
  deposit_cash: "Ingreso de efectivo",
};
export const TYPES = Object.keys(TYPE_LABEL) as MovementType[];

export interface ClosedDay {
  id: string;
  date: string; // AAAA-MM-DD
  currency: string;
  opening: number;
  counted: number;
  result: CloseResult;
  movements: Movement[];
}
export interface Draft { currency: string; opening: number | null; movements: Movement[]; nextId: number }

export const emptyDraft = (currency = "COP"): Draft => ({ currency, opening: null, movements: [], nextId: 1 });

export function addMovement(d: Draft, type: MovementType, amount: number, note: string): Draft {
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new RangeError("El monto debe ser mayor que cero.");
  const m: Movement = { id: String(d.nextId), type, amount, ...(note.trim() ? { note: note.trim().slice(0, 80) } : {}) };
  return { ...d, movements: [...d.movements, m], nextId: d.nextId + 1 };
}
export function removeMovement(d: Draft, id: string): Draft {
  return { ...d, movements: d.movements.filter((m) => m.id !== id) };
}

export function closeDay(d: Draft, counted: number, date: string, id: string): ClosedDay {
  const opening = d.opening ?? 0;
  const result = closeCashRegister({ openingCash: opening, movements: d.movements, countedCash: counted });
  return { id, date, currency: d.currency, opening, counted, result, movements: d.movements };
}

const q = (s: string | number) => `"${String(s).replace(/"/g, '""')}"`;
/** Cifras en unidades menores (centavos) para que la hoja de cálculo no pierda precisión. */
export function toCsv(days: readonly ClosedDay[]): string {
  const head = ["fecha", "moneda", "fondo_inicial", "esperado", "contado", "diferencia", "ventas_totales", "ventas_efectivo", "ventas_tarjeta", "ventas_transferencia", "ventas_fiado", "cobros_fiado", "gastos", "retiros", "ingresos"];
  const rows = days.map((c) => {
    const t = c.result.totals;
    return [c.date, c.currency, c.opening, c.result.expectedCash, c.counted, c.result.difference, t.totalSales, t.cashSales, t.cardSales, t.transferSales, t.creditSales, t.creditPaymentsCash, t.expensesCash, t.withdrawalsCash, t.depositsCash].map(q).join(",");
  });
  return [head.join(","), ...rows].join("\n");
}

const isMovement = (m: any): m is Movement => m && typeof m.id === "string" && TYPES.includes(m.type) && Number.isSafeInteger(m.amount) && m.amount > 0;
export function parseHistory(raw: unknown): ClosedDay[] | null {
  if (!Array.isArray(raw)) return null;
  const out: ClosedDay[] = [];
  for (const c of raw) {
    if (!c || typeof c.id !== "string" || typeof c.date !== "string" || typeof c.currency !== "string" || !Number.isSafeInteger(c.counted) || !Number.isSafeInteger(c.opening) || !Array.isArray(c.movements) || !c.movements.every(isMovement)) continue;
    try { out.push(closeDay({ currency: c.currency, opening: c.opening, movements: c.movements, nextId: 1 }, c.counted, c.date, c.id)); } catch { /* registro corrupto: se omite */ }
  }
  return out;
}
export function parseDraft(raw: unknown): Draft | null {
  const r = raw as Draft | null;
  if (!r || typeof r.currency !== "string" || !Array.isArray(r.movements) || !r.movements.every(isMovement) || !Number.isSafeInteger(r.nextId)) return null;
  if (r.opening !== null && !Number.isSafeInteger(r.opening)) return null;
  return r;
}
