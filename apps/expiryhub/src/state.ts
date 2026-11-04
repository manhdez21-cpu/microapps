import { dueInfo, parseYmd, type DueState } from "../../../packages/core/src/index.ts";

export interface Item { id: string; name: string; expiry: string; place: string }
export interface Data { items: Item[]; warnDays: number; nextId: number }
export const emptyData = (): Data => ({ items: [], warnDays: 7, nextId: 1 });

export function addItem(d: Data, name: string, expiry: string, place: string): Data {
  const n = name.trim();
  if (!n) throw new RangeError("Escribe el nombre del producto.");
  if (!parseYmd(expiry)) throw new RangeError("Elige una fecha de vencimiento válida.");
  const item: Item = { id: String(d.nextId), name: n.slice(0, 60), expiry, place: place.trim().slice(0, 40) };
  return { ...d, items: [...d.items, item], nextId: d.nextId + 1 };
}
export const removeItem = (d: Data, id: string): Data => ({ ...d, items: d.items.filter((i) => i.id !== id) });
export function setWarnDays(d: Data, n: number): Data {
  if (!Number.isInteger(n) || n < 1 || n > 365) throw new RangeError("Los días de aviso van de 1 a 365.");
  return { ...d, warnDays: n };
}

export interface Group { state: DueState | "later"; title: string; items: { item: Item; daysLeft: number }[] }
/** Agrupa por urgencia. "ok" se muestra como "Más adelante". Dentro de cada grupo, lo más cercano primero. */
export function group(d: Data, today: string): Group[] {
  const defs: { state: Group["state"]; title: string }[] = [
    { state: "expired", title: "Vencidos" }, { state: "today", title: "Vencen hoy" },
    { state: "soon", title: `Vencen pronto (≤ ${d.warnDays} días)` }, { state: "later", title: "Más adelante" },
  ];
  const groups: Group[] = defs.map((x) => ({ ...x, items: [] }));
  for (const item of d.items) {
    const { state, daysLeft } = dueInfo(today, item.expiry, d.warnDays);
    groups.find((g) => g.state === (state === "ok" ? "later" : state))!.items.push({ item, daysLeft });
  }
  for (const g of groups) g.items.sort((a, b) => a.daysLeft - b.daysLeft || a.item.name.localeCompare(b.item.name, "es"));
  return groups.filter((g) => g.items.length > 0);
}

const q = (s: string | number) => `"${String(s).replace(/"/g, '""')}"`;
export function toCsv(d: Data, today: string): string {
  const rows = group(d, today).flatMap((g) => g.items.map((x) => [x.item.name, x.item.place, x.item.expiry, x.daysLeft, g.title].map(q).join(",")));
  return ["producto,lugar,vence,dias_restantes,estado", ...rows].join("\n");
}
export function parseData(raw: unknown): Data | null {
  const r = raw as Data | null;
  if (!r || !Array.isArray(r.items) || !Number.isInteger(r.nextId) || !Number.isInteger(r.warnDays) || r.warnDays < 1 || r.warnDays > 365) return null;
  const items = r.items.filter((i) => i && typeof i.id === "string" && typeof i.name === "string" && typeof i.place === "string" && typeof i.expiry === "string" && parseYmd(i.expiry));
  return { items, warnDays: r.warnDays, nextId: r.nextId };
}
