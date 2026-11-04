import { compute, type Form } from "./calc.ts";

export interface Quote { id: string; client: string; job: string; days: number; note: string; createdAt: string; form: Form; gross: number; tax: number }
export interface Scenario { marginPct: number; gross: number; profit: number; markupBps: number }

/** Mismos costos con distintos márgenes, para ver cuánto cambia el precio y la ganancia. */
export function scenarios(form: Form, margins: readonly number[] = [10, 20, 30, 40, 50]): Scenario[] {
  const out: Scenario[] = [];
  for (const m of margins) {
    const o = compute({ ...form, goal: "margin", goalPct: String(m) });
    if (o.ok) out.push({ marginPct: m, gross: o.result.grossPrice, profit: o.result.profit, markupBps: o.result.actualMarkupBps });
  }
  return out;
}

const FORM_KEYS: (keyof Form)[] = ["currency", "materials", "hours", "rate", "transport", "overhead", "commissionPct", "goal", "goalPct", "taxPct"];
export function makeQuote(form: Form, meta: { client: string; job: string; days: number; note: string }, id: string, now: string): Quote {
  const o = compute(form);
  if (!o.ok) throw new RangeError(o.error);
  const job = meta.job.trim().slice(0, 80);
  if (!job) throw new RangeError("Escribe de qué trabajo es la cotización.");
  const days = Number.isInteger(meta.days) && meta.days >= 1 && meta.days <= 365 ? meta.days : 15;
  return { id, client: meta.client.trim().slice(0, 60), job, days, note: meta.note.trim().slice(0, 200), createdAt: now, form: { ...form }, gross: o.result.grossPrice, tax: o.result.tax };
}
export const addQuote = (list: readonly Quote[], q: Quote): Quote[] => [q, ...list.filter((x) => x.id !== q.id)].slice(0, 60);
export const removeQuote = (list: readonly Quote[], id: string): Quote[] => list.filter((x) => x.id !== id);

/** Texto para el cliente: muestra el precio final, no tus costos ni tu margen. */
export function quoteText(q: Quote, money: (m: number) => string, seller = ""): string {
  const lines = [`*Cotización: ${q.job}*`];
  if (q.client) lines.push(`Para: ${q.client}`);
  lines.push(`Fecha: ${q.createdAt.slice(0, 10)}`, "", `Valor total: ${money(q.gross)}`);
  lines.push(q.tax > 0 ? `Incluye impuesto de ${money(q.tax)}.` : "Precio sin impuesto.");
  lines.push(`Válida por ${q.days} días.`);
  if (q.note) lines.push("", q.note);
  if (seller) lines.push("", seller);
  return lines.join("\n");
}

export function parseQuotes(raw: unknown): Quote[] | null {
  if (!Array.isArray(raw)) return null;
  const out: Quote[] = [];
  for (const q of raw as Quote[]) {
    if (!q || typeof q.id !== "string" || typeof q.job !== "string" || typeof q.client !== "string" || typeof q.note !== "string" || typeof q.createdAt !== "string" || !Number.isSafeInteger(q.gross) || !Number.isSafeInteger(q.tax) || !Number.isInteger(q.days) || !q.form || !FORM_KEYS.every((k) => typeof q.form[k] === "string")) continue;
    if (!compute(q.form).ok) continue;
    out.push(q);
  }
  return out;
}
