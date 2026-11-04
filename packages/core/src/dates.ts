/** Fechas como texto AAAA-MM-DD, sin zonas horarias: todo se calcula en días enteros (UTC). */
export interface Ymd { y: number; m: number; d: number }

export function parseYmd(s: string): Ymd | null {
  const r = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!r) return null;
  const y = Number(r[1]), m = Number(r[2]), d = Number(r[3]);
  if (m < 1 || m > 12 || d < 1 || d > daysInMonth(y, m)) return null;
  return { y, m, d };
}
export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}
export function formatYmd(v: Ymd): string {
  return `${String(v.y).padStart(4, "0")}-${String(v.m).padStart(2, "0")}-${String(v.d).padStart(2, "0")}`;
}
export function toDayNumber(s: string): number {
  const v = parseYmd(s);
  if (!v) throw new RangeError(`fecha inválida: ${s}`);
  return Math.round(Date.UTC(v.y, v.m - 1, v.d) / 86_400_000);
}
export function fromDayNumber(n: number): string {
  const dt = new Date(n * 86_400_000);
  return formatYmd({ y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() });
}
export function daysBetween(from: string, to: string): number {
  return toDayNumber(to) - toDayNumber(from);
}
export function addDays(s: string, n: number): string {
  return fromDayNumber(toDayNumber(s) + n);
}
/** Suma meses; si el día no existe en el mes destino, usa el último día (31 ene + 1 mes = 28/29 feb). */
export function addMonths(s: string, n: number): string {
  const v = parseYmd(s);
  if (!v) throw new RangeError(`fecha inválida: ${s}`);
  const total = v.y * 12 + (v.m - 1) + n;
  const y = Math.floor(total / 12), m = (total % 12 + 12) % 12 + 1;
  return formatYmd({ y, m, d: Math.min(v.d, daysInMonth(y, m)) });
}

export type DueState = "expired" | "today" | "soon" | "ok";
export interface DueInfo { state: DueState; daysLeft: number }
/** daysLeft < 0 = ya venció hace |daysLeft| días. "soon" = faltan 1..warnDays días. */
export function dueInfo(today: string, due: string, warnDays: number): DueInfo {
  const daysLeft = daysBetween(today, due);
  const state: DueState = daysLeft < 0 ? "expired" : daysLeft === 0 ? "today" : daysLeft <= warnDays ? "soon" : "ok";
  return { state, daysLeft };
}
