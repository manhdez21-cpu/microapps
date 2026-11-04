import { closeCashRegister, type CloseResult, type Movement, type MovementType } from "../../../packages/core/src/index.ts";
import { addDays, daysInMonth, formatYmd, parseYmd } from "../../../packages/core/src/index.ts";

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

export type Period = "day" | "week" | "month";
/** Rango [desde, hasta] (AAAA-MM-DD, inclusivo) que contiene `ref`: el día, la semana lunes–domingo o el mes. */
export function periodRange(kind: Period, ref: string): { from: string; to: string } {
  const p = parseYmd(ref);
  if (!p) throw new RangeError("Fecha inválida.");
  if (kind === "day") return { from: ref, to: ref };
  if (kind === "month") return { from: formatYmd({ y: p.y, m: p.m, d: 1 }), to: formatYmd({ y: p.y, m: p.m, d: daysInMonth(p.y, p.m) }) };
  const dow = (new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay() + 6) % 7; // lunes = 0
  const from = addDays(ref, -dow);
  return { from, to: addDays(from, 6) };
}
export interface Report { days: number; sales: number; cash: number; card: number; transfer: number; credit: number; creditPayments: number; expenses: number; withdrawals: number; deposits: number; difference: number; short: number; over: number; even: number }
/** Suma los cierres de una moneda dentro del rango. Una moneda a la vez: nunca se mezclan. */
export function report(days: readonly ClosedDay[], currency: string, from: string, to: string): Report {
  const r: Report = { days: 0, sales: 0, cash: 0, card: 0, transfer: 0, credit: 0, creditPayments: 0, expenses: 0, withdrawals: 0, deposits: 0, difference: 0, short: 0, over: 0, even: 0 };
  for (const c of days) {
    if (c.currency !== currency || c.date < from || c.date > to) continue;
    const t = c.result.totals, d = c.result.difference;
    r.days++; r.sales += t.totalSales; r.cash += t.cashSales; r.card += t.cardSales; r.transfer += t.transferSales; r.credit += t.creditSales;
    r.creditPayments += t.creditPaymentsCash; r.expenses += t.expensesCash; r.withdrawals += t.withdrawalsCash; r.deposits += t.depositsCash; r.difference += d;
    if (d < 0) r.short += -d; else if (d > 0) r.over += d; else r.even++;
  }
  return r;
}

export interface ClientDebt { client: string; sold: number; paid: number; pending: number }
const clientOf = (m: Movement) => (m.note ?? "").trim().replace(/\s+/g, " ") || "Sin nombre";
/** Fiados por cliente (el nombre va en la nota): lo vendido a crédito menos lo cobrado en efectivo. Solo una moneda. */
export function creditByClient(days: readonly ClosedDay[], draft: Draft): ClientDebt[] {
  const map = new Map<string, ClientDebt & { key: string }>();
  const add = (m: Movement) => {
    if (m.type !== "credit_sale" && m.type !== "credit_payment_cash") return;
    const name = clientOf(m), key = name.toLowerCase();
    const e = map.get(key) ?? { key, client: name, sold: 0, paid: 0, pending: 0 };
    if (m.type === "credit_sale") e.sold += m.amount; else e.paid += m.amount;
    map.set(key, e);
  };
  for (const c of days) if (c.currency === draft.currency) c.movements.forEach(add);
  draft.movements.forEach(add);
  return [...map.values()].map(({ key: _k, ...e }) => ({ ...e, pending: e.sold - e.paid })).filter((e) => e.pending !== 0).sort((a, b) => b.pending - a.pending);
}

export interface DayPoint { date: string; sales: number }
/** Ventas totales por día dentro del rango (para la gráfica). */
export function salesByDay(days: readonly ClosedDay[], currency: string, from: string, to: string): DayPoint[] {
  const m = new Map<string, number>();
  for (const c of days) if (c.currency === currency && c.date >= from && c.date <= to) m.set(c.date, (m.get(c.date) ?? 0) + c.result.totals.totalSales);
  return [...m].map(([date, sales]) => ({ date, sales })).sort((a, b) => (a.date < b.date ? -1 : 1));
}
