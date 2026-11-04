import { addDays, addMonths, dueInfo, parseYmd, daysInMonth, toDayNumber, type DueState } from "../../../packages/core/src/index.ts";

export type Category = "soat" | "seguro" | "licencia" | "contrato" | "poliza" | "suscripcion" | "permiso" | "personal" | "otro";
export const CATEGORY_LABEL: Record<Category, string> = { soat: "SOAT", seguro: "Seguro", licencia: "Licencia", contrato: "Contrato", poliza: "Póliza", suscripcion: "Suscripción", permiso: "Permiso", personal: "Documento personal", otro: "Otro" };
export const CATEGORIES = Object.keys(CATEGORY_LABEL) as Category[];
/** Aviso sugerido; la persona puede cambiarlo. No es un plazo legal. */
export const DEFAULT_WARN: Record<Category, number> = { soat: 30, seguro: 30, licencia: 45, contrato: 30, poliza: 30, suscripcion: 7, permiso: 30, personal: 60, otro: 30 };

export interface Profile { id: string; name: string }
export interface Renewal { on: string; from: string; to: string }
export interface Doc { id: string; profileId: string; category: Category; title: string; expiry: string; warnDays: number; note: string; file: string; renewals: Renewal[]; provider: string; cost: number; repeat: number }
export interface Data { profiles: Profile[]; docs: Doc[]; nextId: number; currency?: string }
export const emptyData = (): Data => ({ profiles: [{ id: "u1", name: "Yo" }], docs: [], nextId: 2, currency: "COP" });
export const setCurrency = (d: Data, currency: string): Data => ({ ...d, currency });
const clean = (s: string, n: number) => s.trim().slice(0, n);

export function addProfile(d: Data, name: string): Data {
  const n = clean(name, 30);
  if (!n) throw new RangeError("Escribe el nombre del perfil (por ejemplo, Mi carro).");
  if (d.profiles.some((p) => p.name.toLowerCase() === n.toLowerCase())) throw new RangeError(`Ya existe el perfil «${n}».`);
  if (d.profiles.length >= 8) throw new RangeError("Por ahora puedes tener hasta 8 perfiles.");
  return { ...d, profiles: [...d.profiles, { id: `u${d.nextId}`, name: n }], nextId: d.nextId + 1 };
}
export function removeProfile(d: Data, id: string): Data {
  if (d.docs.some((x) => x.profileId === id)) throw new RangeError("Ese perfil tiene documentos. Bórralos o pásalos a otro perfil primero.");
  if (d.profiles.length <= 1) throw new RangeError("Debe quedar al menos un perfil.");
  return { ...d, profiles: d.profiles.filter((p) => p.id !== id) };
}

export interface DocInput { profileId: string; category: Category; title: string; expiry: string; warnDays?: number | undefined; note?: string; provider?: string; cost?: number | undefined; repeat?: number | undefined }
function buildDoc(d: Data, i: DocInput, id: string, keep?: Doc): Doc {
  if (!d.profiles.some((p) => p.id === i.profileId)) throw new RangeError("Elige un perfil.");
  if (!CATEGORIES.includes(i.category)) throw new RangeError("Elige el tipo de documento.");
  const title = clean(i.title, 60);
  if (!title) throw new RangeError("Escribe el nombre del documento (por ejemplo, SOAT del carro).");
  if (!parseYmd(i.expiry)) throw new RangeError("Elige una fecha de vencimiento válida.");
  const warn = i.warnDays ?? DEFAULT_WARN[i.category];
  if (!Number.isInteger(warn) || warn < 0 || warn > 365) throw new RangeError("Los días de aviso van de 0 a 365.");
  const cost = i.cost ?? 0, repeat = i.repeat ?? 0;
  if (!Number.isSafeInteger(cost) || cost < 0) throw new RangeError("El costo debe ser un monto válido (o déjalo vacío).");
  if (!Number.isInteger(repeat) || repeat < 0 || repeat > 120) throw new RangeError("«Se repite cada» va de 1 a 120 meses (o déjalo vacío).");
  return { id, profileId: i.profileId, category: i.category, title, expiry: i.expiry, warnDays: warn, note: clean(i.note ?? "", 160), file: keep?.file ?? "", renewals: keep?.renewals ?? [], provider: clean(i.provider ?? "", 60), cost, repeat };
}
export function addDoc(d: Data, i: DocInput): Data {
  return { ...d, docs: [...d.docs, buildDoc(d, i, `d${d.nextId}`)], nextId: d.nextId + 1 };
}
/** Corrige los datos de un documento sin tocar su adjunto ni su historial de renovaciones. */
export function updateDoc(d: Data, id: string, i: DocInput): Data {
  const old = d.docs.find((x) => x.id === id);
  if (!old) throw new RangeError("No se encontró el documento.");
  return { ...d, docs: d.docs.map((x) => (x.id === id ? buildDoc(d, i, id, old) : x)) };
}
/** Nueva fecha sugerida al renovar: cada «repeat» meses, o un año si no se indicó. */
export const suggestedRenewal = (x: Pick<Doc, "expiry" | "repeat">): string => addMonths(x.expiry, x.repeat > 0 ? x.repeat : 12);
/** Cuánto costarán las renovaciones vencidas o que caen en los próximos 12 meses (solo documentos con costo). */
export function upcomingCost(d: Data, today: string, profileId = ""): { total: number; count: number } {
  const limit = addMonths(today, 12);
  const list = d.docs.filter((x) => (!profileId || x.profileId === profileId) && x.cost > 0 && x.expiry <= limit);
  return { total: list.reduce((a, x) => a + x.cost, 0), count: list.length };
}
export const removeDoc = (d: Data, id: string): Data => ({ ...d, docs: d.docs.filter((x) => x.id !== id) });
export const setFile = (d: Data, id: string, file: string): Data => ({ ...d, docs: d.docs.map((x) => (x.id === id ? { ...x, file } : x)) });

/** Renovar = poner la nueva fecha de vencimiento y guardar la anterior en el historial. */
export function renewDoc(d: Data, id: string, newExpiry: string, today: string): Data {
  const doc = d.docs.find((x) => x.id === id);
  if (!doc) throw new RangeError("No se encontró el documento.");
  if (!parseYmd(newExpiry)) throw new RangeError("Elige la nueva fecha de vencimiento.");
  if (newExpiry <= doc.expiry) throw new RangeError("La nueva fecha debe ser posterior a la actual.");
  return { ...d, docs: d.docs.map((x) => (x.id === id ? { ...x, expiry: newExpiry, renewals: [{ on: today, from: x.expiry, to: newExpiry }, ...x.renewals].slice(0, 20) } : x)) };
}

export interface Row { doc: Doc; state: DueState; daysLeft: number }
export const rowsFor = (d: Data, today: string, profileId = ""): Row[] =>
  d.docs.filter((x) => !profileId || x.profileId === profileId).map((doc) => ({ doc, ...dueInfo(today, doc.expiry, doc.warnDays) })).sort((a, b) => a.daysLeft - b.daysLeft || a.doc.title.localeCompare(b.doc.title, "es"));

export interface Group { key: DueState | "later"; title: string; rows: Row[] }
/** Atrasados, hoy, en aviso y «más adelante». */
export function groups(rows: Row[]): Group[] {
  const defs: Group[] = [{ key: "expired", title: "Vencidos", rows: [] }, { key: "today", title: "Vencen hoy", rows: [] }, { key: "soon", title: "En aviso", rows: [] }, { key: "later", title: "Más adelante", rows: [] }];
  for (const r of rows) defs.find((g) => g.key === (r.state === "ok" ? "later" : r.state))!.rows.push(r);
  return defs.filter((g) => g.rows.length > 0);
}

export interface Cell { day: number; ymd: string; docs: Doc[] }
/** Cuadrícula del mes, semanas de lunes a domingo; `null` = hueco. */
export function monthGrid(year: number, month: number, docs: readonly Doc[]): (Cell | null)[][] {
  const total = daysInMonth(year, month);
  const lead = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  const cells: (Cell | null)[] = Array.from({ length: lead }, () => null);
  for (let day = 1; day <= total; day++) {
    const ymd = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({ day, ymd, docs: docs.filter((x) => x.expiry === ymd) });
  }
  while (cells.length % 7) cells.push(null);
  const weeks: (Cell | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const fold = (line: string) => (line.length <= 73 ? line : line.match(/.{1,73}/g)!.join("\r\n "));
/** Archivo .ics (evento de día completo con alarma `warnDays` antes) para el calendario del teléfono o el computador. */
export function toIcs(d: Data, today: string): string {
  const stamp = today.replace(/-/g, "") + "T000000Z";
  const events = d.docs.flatMap((x) => {
    const end = addDays(x.expiry, 1).replace(/-/g, "");
    return ["BEGIN:VEVENT", `UID:${x.id}-${x.expiry}@expiryhub`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${x.expiry.replace(/-/g, "")}`, `DTEND;VALUE=DATE:${end}`, fold(`SUMMARY:Vence: ${esc(x.title)}`), ...(x.note ? [fold(`DESCRIPTION:${esc(x.note)}`)] : []), "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:Vencimiento próximo", `TRIGGER:-P${x.warnDays}D`, "END:VALARM", "END:VEVENT"];
  });
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Microapps//ExpiryHub//ES", "CALSCALE:GREGORIAN", ...events, "END:VCALENDAR"].join("\r\n") + "\r\n";
}

const q = (s: string | number) => `"${String(s).replace(/"/g, '""')}"`;
export function toCsv(d: Data, today: string): string {
  const name = (id: string) => d.profiles.find((p) => p.id === id)?.name ?? "";
  return ["perfil,tipo,documento,vence,dias_restantes,aviso_dias,nota,proveedor,costo,se_repite_meses", ...rowsFor(d, today).map((r) => [name(r.doc.profileId), CATEGORY_LABEL[r.doc.category], r.doc.title, r.doc.expiry, r.daysLeft, r.doc.warnDays, r.doc.note, r.doc.provider, r.doc.cost, r.doc.repeat].map(q).join(","))].join("\n");
}

export function parseData(raw: unknown): Data | null {
  const r = raw as Data | null;
  if (!r || !Array.isArray(r.profiles) || !Array.isArray(r.docs) || !Number.isInteger(r.nextId)) return null;
  const profiles = r.profiles.filter((p) => p && typeof p.id === "string" && typeof p.name === "string");
  if (profiles.length === 0) return null;
  const ids = new Set(profiles.map((p) => p.id));
  const docs = r.docs.filter((x) => x && typeof x.id === "string" && ids.has(x.profileId) && CATEGORIES.includes(x.category) && typeof x.title === "string" && !!parseYmd(x.expiry) && Number.isInteger(x.warnDays) && typeof x.note === "string" && typeof x.file === "string")
    .map((x) => ({ ...x, provider: typeof x.provider === "string" ? x.provider : "", cost: Number.isSafeInteger(x.cost) && x.cost >= 0 ? x.cost : 0, repeat: Number.isInteger(x.repeat) && x.repeat >= 0 && x.repeat <= 120 ? x.repeat : 0, renewals: Array.isArray(x.renewals) ? x.renewals.filter((n) => n && parseYmd(n.on) && parseYmd(n.from) && parseYmd(n.to)) : [] }));
  return { profiles, docs, nextId: r.nextId, currency: typeof r.currency === "string" && /^[A-Z]{3}$/.test(r.currency) ? r.currency : "COP" };
}
export { toDayNumber };
