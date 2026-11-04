import { addDays, addMonths, dueInfo, parseYmd, type DueState } from "../../../packages/core/src/index.ts";

export interface Warranty { id: string; name: string; brand: string; model: string; store: string; purchase: string; months: number; note: string; file: string;
  serial: string; price: number; service: string; extra: number; returnDays: number }
export interface Data { items: Warranty[]; nextId: number; currency?: string }
export const emptyData = (): Data => ({ items: [], nextId: 1, currency: "COP" });
export const setCurrency = (d: Data, currency: string): Data => ({ ...d, currency });
export const WARN_DAYS = 30;
const clean = (s: string, n: number) => s.trim().slice(0, n);

/** Fin de la garantía: compra + meses de garantía + meses de garantía extendida. */
export const endDate = (w: Pick<Warranty, "purchase" | "months"> & { extra?: number }): string => addMonths(w.purchase, w.months + (w.extra ?? 0));
/** Último día para devolver el producto (compra + días), si se indicó un plazo. */
export const returnDeadline = (w: Pick<Warranty, "purchase" | "returnDays">): string | null => (w.returnDays > 0 ? addDays(w.purchase, w.returnDays) : null);

export interface WInput { name: string; brand?: string; model?: string; store?: string; purchase: string; months: number; note?: string; serial?: string; price?: number | undefined; service?: string; extra?: number | undefined; returnDays?: number | undefined }
function build(i: WInput, id: string, file: string): Warranty {
  if (!clean(i.name, 60)) throw new RangeError("Escribe qué producto es.");
  if (!parseYmd(i.purchase)) throw new RangeError("Elige la fecha de compra.");
  if (!Number.isInteger(i.months) || i.months < 1 || i.months > 240) throw new RangeError("La garantía va de 1 a 240 meses.");
  const price = i.price ?? 0, extra = i.extra ?? 0, returnDays = i.returnDays ?? 0;
  if (!Number.isSafeInteger(price) || price < 0) throw new RangeError("El precio debe ser un monto válido (o déjalo vacío).");
  if (!Number.isInteger(extra) || extra < 0 || extra > 120) throw new RangeError("La garantía extendida va de 0 a 120 meses.");
  if (!Number.isInteger(returnDays) || returnDays < 0 || returnDays > 365) throw new RangeError("El plazo de devolución va de 0 a 365 días.");
  return { id, name: clean(i.name, 60), brand: clean(i.brand ?? "", 40), model: clean(i.model ?? "", 40), store: clean(i.store ?? "", 40), purchase: i.purchase, months: i.months, note: clean(i.note ?? "", 120), file, serial: clean(i.serial ?? "", 40), price, service: clean(i.service ?? "", 80), extra, returnDays };
}
export function addWarranty(d: Data, i: WInput): Data {
  return { ...d, items: [...d.items, build(i, `w${d.nextId}`, "")], nextId: d.nextId + 1 };
}
/** Corrige una garantía conservando su factura adjunta. */
export function updateWarranty(d: Data, id: string, i: WInput): Data {
  const old = d.items.find((x) => x.id === id);
  if (!old) throw new RangeError("No se encontró la garantía.");
  return { ...d, items: d.items.map((x) => (x.id === id ? build(i, id, old.file) : x)) };
}
export const removeWarranty = (d: Data, id: string): Data => ({ ...d, items: d.items.filter((i) => i.id !== id) });
export const setFile = (d: Data, id: string, file: string): Data => ({ ...d, items: d.items.map((i) => (i.id === id ? { ...i, file } : i)) });

export interface Row { w: Warranty; end: string; state: DueState; daysLeft: number; returnLeft: number | null }
/** Valor de lo que aún tiene garantía vigente (suma de precios de las vigentes que tienen precio). */
export function coveredValue(rs: readonly Row[]): { total: number; count: number } {
  const l = rs.filter((r) => r.state !== "expired" && r.w.price > 0);
  return { total: l.reduce((a, r) => a + r.w.price, 0), count: l.length };
}
export type Filter = "all" | "active" | "soon" | "ended";
/** Vigentes primero (la que termina antes arriba); las terminadas al final, la más reciente primero. */
export function rows(d: Data, today: string): Row[] {
  const r = d.items.map((w) => { const end = endDate(w); const ret = returnDeadline(w); const rl = ret ? dueInfo(today, ret, 0).daysLeft : null; return { w, end, ...dueInfo(today, end, WARN_DAYS), returnLeft: rl !== null && rl >= 0 ? rl : null }; });
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
    const hay = fold([r.w.name, r.w.brand, r.w.model, r.w.serial, r.w.store, r.w.service, r.w.note].join(" "));
    return terms.every((t) => hay.includes(t));
  });
}

const q = (s: string | number) => `"${String(s).replace(/"/g, '""')}"`;
export function toCsv(d: Data, today: string): string {
  return ["producto,marca,modelo,serie,tienda,compra,meses,extension_meses,termina,dias_restantes,precio,servicio_tecnico,nota", ...rows(d, today).map((x) => [x.w.name, x.w.brand, x.w.model, x.w.serial, x.w.store, x.w.purchase, x.w.months, x.w.extra, x.end, x.daysLeft, x.w.price, x.w.service, x.w.note].map(q).join(","))].join("\n");
}
export function parseData(raw: unknown): Data | null {
  const r = raw as Data | null;
  if (!r || !Array.isArray(r.items) || !Number.isInteger(r.nextId)) return null;
  return { nextId: r.nextId, currency: typeof r.currency === "string" && /^[A-Z]{3}$/.test(r.currency) ? r.currency : "COP", items: r.items.filter((i) => i && typeof i.id === "string" && typeof i.name === "string" && typeof i.brand === "string" && typeof i.model === "string" && typeof i.store === "string" && typeof i.note === "string" && typeof i.file === "string" && typeof i.purchase === "string" && parseYmd(i.purchase) && Number.isInteger(i.months) && i.months >= 1 && i.months <= 240).map((i) => ({ ...i, serial: typeof i.serial === "string" ? i.serial : "", service: typeof i.service === "string" ? i.service : "", price: Number.isSafeInteger(i.price) && i.price >= 0 ? i.price : 0, extra: Number.isInteger(i.extra) && i.extra >= 0 && i.extra <= 120 ? i.extra : 0, returnDays: Number.isInteger(i.returnDays) && i.returnDays >= 0 && i.returnDays <= 365 ? i.returnDays : 0 })) };
}
