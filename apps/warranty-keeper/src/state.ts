import { addMonths, dueInfo, parseYmd, type DueState } from "../../../packages/core/src/index.ts";

export interface Warranty { id: string; name: string; store: string; purchase: string; months: number; note: string }
export interface Data { items: Warranty[]; nextId: number }
export const emptyData = (): Data => ({ items: [], nextId: 1 });
export const WARN_DAYS = 30;

export const endDate = (w: Pick<Warranty, "purchase" | "months">): string => addMonths(w.purchase, w.months);

export function addWarranty(d: Data, name: string, store: string, purchase: string, months: number, note: string): Data {
  if (!name.trim()) throw new RangeError("Escribe qué producto es.");
  if (!parseYmd(purchase)) throw new RangeError("Elige la fecha de compra.");
  if (!Number.isInteger(months) || months < 1 || months > 240) throw new RangeError("La garantía va de 1 a 240 meses.");
  const w: Warranty = { id: String(d.nextId), name: name.trim().slice(0, 60), store: store.trim().slice(0, 40), purchase, months, note: note.trim().slice(0, 120) };
  return { items: [...d.items, w], nextId: d.nextId + 1 };
}
export const removeWarranty = (d: Data, id: string): Data => ({ ...d, items: d.items.filter((i) => i.id !== id) });

export interface Row { w: Warranty; end: string; state: DueState; daysLeft: number }
/** Vigentes primero (la que termina antes arriba); las vencidas al final, la más reciente primero. */
export function rows(d: Data, today: string): Row[] {
  const r = d.items.map((w) => { const end = endDate(w); return { w, end, ...dueInfo(today, end, WARN_DAYS) }; });
  const active = r.filter((x) => x.state !== "expired").sort((a, b) => a.daysLeft - b.daysLeft);
  const expired = r.filter((x) => x.state === "expired").sort((a, b) => b.daysLeft - a.daysLeft);
  return [...active, ...expired];
}
const q = (s: string | number) => `"${String(s).replace(/"/g, '""')}"`;
export function toCsv(d: Data, today: string): string {
  return ["producto,tienda,compra,meses,termina,dias_restantes,nota", ...rows(d, today).map((x) => [x.w.name, x.w.store, x.w.purchase, x.w.months, x.end, x.daysLeft, x.w.note].map(q).join(","))].join("\n");
}
export function parseData(raw: unknown): Data | null {
  const r = raw as Data | null;
  if (!r || !Array.isArray(r.items) || !Number.isInteger(r.nextId)) return null;
  return { nextId: r.nextId, items: r.items.filter((i) => i && typeof i.id === "string" && typeof i.name === "string" && typeof i.store === "string" && typeof i.note === "string" && typeof i.purchase === "string" && parseYmd(i.purchase) && Number.isInteger(i.months) && i.months >= 1 && i.months <= 240) };
}
