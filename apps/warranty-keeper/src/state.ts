import { addMonths, dueInfo, parseYmd, type DueState } from "../../../packages/core/src/index.ts";

export interface Warranty { id: string; name: string; brand: string; model: string; store: string; purchase: string; months: number; note: string; file: string }
export interface Data { items: Warranty[]; nextId: number }
export const emptyData = (): Data => ({ items: [], nextId: 1 });
export const WARN_DAYS = 30;
const clean = (s: string, n: number) => s.trim().slice(0, n);

export const endDate = (w: Pick<Warranty, "purchase" | "months">): string => addMonths(w.purchase, w.months);

export interface WInput { name: string; brand?: string; model?: string; store?: string; purchase: string; months: number; note?: string }
export function addWarranty(d: Data, i: WInput): Data {
  if (!clean(i.name, 60)) throw new RangeError("Escribe qué producto es.");
  if (!parseYmd(i.purchase)) throw new RangeError("Elige la fecha de compra.");
  if (!Number.isInteger(i.months) || i.months < 1 || i.months > 240) throw new RangeError("La garantía va de 1 a 240 meses.");
  const w: Warranty = { id: `w${d.nextId}`, name: clean(i.name, 60), brand: clean(i.brand ?? "", 40), model: clean(i.model ?? "", 40), store: clean(i.store ?? "", 40), purchase: i.purchase, months: i.months, note: clean(i.note ?? "", 120), file: "" };
  return { items: [...d.items, w], nextId: d.nextId + 1 };
}
export const removeWarranty = (d: Data, id: string): Data => ({ ...d, items: d.items.filter((i) => i.id !== id) });
export const setFile = (d: Data, id: string, file: string): Data => ({ ...d, items: d.items.map((i) => (i.id === id ? { ...i, file } : i)) });

export interface Row { w: Warranty; end: string; state: DueState; daysLeft: number }
export type Filter = "all" | "active" | "soon" | "ended";
/** Vigentes primero (la que termina antes arriba); las terminadas al final, la más reciente primero. */
export function rows(d: Data, today: string): Row[] {
  const r = d.items.map((w) => { const end = endDate(w); return { w, end, ...dueInfo(today, end, WARN_DAYS) }; });
  return [...r.filter((x) => x.state !== "expired").sort((a, b) => a.daysLeft - b.daysLeft), ...r.filter((x) => x.state === "expired").sort((a, b) => b.daysLeft - a.daysLeft)];
}
const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
/** Búsqueda sin tildes ni mayúsculas en producto, marca, modelo, tienda y nota; más un filtro por estado. */
export function search(all: Row[], query: string, filter: Filter): Row[] {
  const terms = fold(query).split(/\s+/).filter(Boolean);
  return all.filter((r) => {
    if (filter === "active" && r.state === "expired") return false;
    if (filter === "soon" && !(r.state === "soon" || r.state === "today")) return false;
    if (filter === "ended" && r.state !== "expired") return false;
    const hay = fold([r.w.name, r.w.brand, r.w.model, r.w.store, r.w.note].join(" "));
    return terms.every((t) => hay.includes(t));
  });
}

const q = (s: string | number) => `"${String(s).replace(/"/g, '""')}"`;
export function toCsv(d: Data, today: string): string {
  return ["producto,marca,modelo,tienda,compra,meses,termina,dias_restantes,nota", ...rows(d, today).map((x) => [x.w.name, x.w.brand, x.w.model, x.w.store, x.w.purchase, x.w.months, x.end, x.daysLeft, x.w.note].map(q).join(","))].join("\n");
}
export function parseData(raw: unknown): Data | null {
  const r = raw as Data | null;
  if (!r || !Array.isArray(r.items) || !Number.isInteger(r.nextId)) return null;
  return { nextId: r.nextId, items: r.items.filter((i) => i && typeof i.id === "string" && typeof i.name === "string" && typeof i.brand === "string" && typeof i.model === "string" && typeof i.store === "string" && typeof i.note === "string" && typeof i.file === "string" && typeof i.purchase === "string" && parseYmd(i.purchase) && Number.isInteger(i.months) && i.months >= 1 && i.months <= 240) };
}
