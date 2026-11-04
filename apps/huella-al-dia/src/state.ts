import { addDays, addMonths, dueInfo, parseYmd, toDayNumber, type DueState } from "../../../packages/core/src/index.ts";

export type Species = "perro" | "gato";
export type RecType = "vacuna" | "desparasitacion" | "peso" | "bano" | "consulta" | "medicamento" | "gasto";
export const REC_LABEL: Record<RecType, string> = { vacuna: "Vacuna", desparasitacion: "Desparasitación", peso: "Peso", bano: "Baño", consulta: "Consulta veterinaria", medicamento: "Medicamento", gasto: "Gasto" };
export const REC_TYPES = Object.keys(REC_LABEL) as RecType[];
/** Tipos que necesitan un nombre ("Rabia", "Antipulgas"...). Peso y gasto/baño pueden ir sin título. */
const NEEDS_TITLE: RecType[] = ["vacuna", "desparasitacion", "consulta", "medicamento"];

export interface Pet { id: string; name: string; species: Species; breed: string; birth: string; sex: "" | "macho" | "hembra"; photo: string; notes: string }
export interface Rec { id: string; petId: string; type: RecType; date: string; title: string; detail: string; weightG?: number; amount?: number; next?: string; repeat?: number }
export interface Data { pets: Pet[]; records: Rec[]; nextId: number; currency: string }
export const MAX_PETS = 5;
export const emptyData = (currency = "COP"): Data => ({ pets: [], records: [], nextId: 1, currency });

const clean = (s: string, n: number) => s.trim().slice(0, n);

export function addPet(d: Data, p: { name: string; species: Species; breed?: string; birth?: string; sex?: Pet["sex"]; photo?: string; notes?: string }, today: string): Data {
  if (!clean(p.name, 40)) throw new RangeError("Escribe el nombre de tu mascota.");
  if (p.species !== "perro" && p.species !== "gato") throw new RangeError("Elige si es perro o gato.");
  if (d.pets.length >= MAX_PETS) throw new RangeError(`Por ahora puedes registrar hasta ${MAX_PETS} mascotas.`);
  const birth = (p.birth ?? "").trim();
  if (birth && (!parseYmd(birth) || birth > today)) throw new RangeError("La fecha de nacimiento no es válida o está en el futuro.");
  const pet: Pet = { id: `p${d.nextId}`, name: clean(p.name, 40), species: p.species, breed: clean(p.breed ?? "", 40), birth, sex: p.sex ?? "", photo: p.photo ?? "", notes: clean(p.notes ?? "", 200) };
  return { ...d, pets: [...d.pets, pet], nextId: d.nextId + 1 };
}
/** Corrige los datos de una mascota. La foto solo cambia si se envía una nueva. */
export function updatePet(d: Data, id: string, p: { name: string; species: Species; breed?: string; birth?: string; sex?: Pet["sex"]; photo?: string; notes?: string }, today: string): Data {
  const old = d.pets.find((x) => x.id === id);
  if (!old) throw new RangeError("No se encontró la mascota.");
  const tmp = addPet({ ...d, pets: [], nextId: 0 }, p, today).pets[0]!; // reutiliza las validaciones
  return { ...d, pets: d.pets.map((x) => (x.id === id ? { ...tmp, id, photo: p.photo === undefined ? old.photo : tmp.photo } : x)) };
}
export const removePet = (d: Data, id: string): Data => ({ ...d, pets: d.pets.filter((p) => p.id !== id), records: d.records.filter((r) => r.petId !== id) });

export interface RecInput { petId: string; type: RecType; date: string; title?: string; detail?: string; weightG?: number | undefined; amount?: number | undefined; next?: string | undefined; repeat?: number | undefined }
function buildRec(d: Data, r: RecInput, today: string, id: string): Rec {
  if (!d.pets.some((p) => p.id === r.petId)) throw new RangeError("Elige una mascota.");
  if (!REC_TYPES.includes(r.type)) throw new RangeError("Tipo de registro desconocido.");
  if (!parseYmd(r.date)) throw new RangeError("Elige una fecha válida.");
  if (r.date > today) throw new RangeError("La fecha no puede estar en el futuro. Usa «próxima fecha» para lo que viene.");
  const title = clean(r.title ?? "", 60);
  if (NEEDS_TITLE.includes(r.type) && !title) throw new RangeError(`Escribe el nombre de la ${REC_LABEL[r.type].toLowerCase()}.`);
  if (r.type === "peso" && !(Number.isSafeInteger(r.weightG) && r.weightG! > 0 && r.weightG! <= 150_000)) throw new RangeError("Escribe un peso válido en kilos.");
  if (r.type === "gasto" && !(Number.isSafeInteger(r.amount) && r.amount! > 0)) throw new RangeError("Escribe el valor del gasto.");
  if (r.amount !== undefined && !(Number.isSafeInteger(r.amount) && r.amount > 0)) throw new RangeError("El valor debe ser mayor que cero.");
  if (r.next && (!parseYmd(r.next) || r.next <= r.date)) throw new RangeError("La próxima fecha debe ser posterior a la fecha del registro.");
  const repeat = r.repeat ?? 0;
  if (!Number.isInteger(repeat) || repeat < 0 || repeat > 120) throw new RangeError("«Se repite cada» va de 1 a 120 meses (o déjalo vacío).");
  const next = r.next || (repeat > 0 ? addMonths(r.date, repeat) : undefined);
  const rec: Rec = { id, petId: r.petId, type: r.type, date: r.date, title, detail: clean(r.detail ?? "", 160), ...(r.type === "peso" && r.weightG ? { weightG: r.weightG } : {}), ...(r.amount ? { amount: r.amount } : {}), ...(next ? { next } : {}), ...(repeat > 0 ? { repeat } : {}) };
  return rec;
}
export function addRecord(d: Data, r: RecInput, today: string): Data {
  return { ...d, records: [...d.records, buildRec(d, r, today, `r${d.nextId}`)], nextId: d.nextId + 1 };
}
/** Corrige un registro conservando su identificador (y su lugar en el historial). */
export function updateRecord(d: Data, id: string, r: RecInput, today: string): Data {
  if (!d.records.some((x) => x.id === id)) throw new RangeError("No se encontró el registro.");
  return { ...d, records: d.records.map((x) => (x.id === id ? buildRec(d, r, today, id) : x)) };
}
export const removeRecord = (d: Data, id: string): Data => ({ ...d, records: d.records.filter((r) => r.id !== id) });

/** Más reciente primero; a igual fecha, el último añadido primero. */
export function history(d: Data, petId: string, type?: RecType): Rec[] {
  const num = (r: Rec) => Number(r.id.slice(1));
  return d.records.filter((r) => r.petId === petId && (!type || r.type === type)).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : num(b) - num(a)));
}

const norm = (s: string) => s.trim().toLowerCase();
export interface Reminder { rec: Rec; state: DueState; daysLeft: number }
/** Un registro con «próxima fecha» sigue pendiente hasta que se anota uno posterior igual (mismo tipo y nombre). */
export function reminders(d: Data, petId: string, today: string, warnDays = 14): Reminder[] {
  const recs = d.records.filter((r) => r.petId === petId);
  return recs
    .filter((r) => r.next && !recs.some((o) => o.id !== r.id && o.type === r.type && norm(o.title) === norm(r.title) && o.date > r.date))
    .map((rec) => ({ rec, ...dueInfo(today, rec.next!, warnDays) }))
    .sort((a, b) => a.daysLeft - b.daysLeft);
}

export function weightSeries(d: Data, petId: string): { date: string; grams: number }[] {
  return d.records.filter((r) => r.petId === petId && r.type === "peso" && r.weightG).sort((a, b) => (a.date < b.date ? -1 : 1)).map((r) => ({ date: r.date, grams: r.weightG! }));
}
/** Gasto por mes (más reciente primero) y por tipo, de una mascota. */
export function spendByMonth(d: Data, petId: string): { month: string; total: number }[] {
  const m = new Map<string, number>();
  for (const r of d.records) if (r.petId === petId && r.amount) m.set(r.date.slice(0, 7), (m.get(r.date.slice(0, 7)) ?? 0) + r.amount);
  return [...m].map(([month, total]) => ({ month, total })).sort((a, b) => (a.month < b.month ? 1 : -1));
}
export function spendByType(d: Data, petId: string): { type: RecType; total: number }[] {
  const m = new Map<RecType, number>();
  for (const r of d.records) if (r.petId === petId && r.amount) m.set(r.type, (m.get(r.type) ?? 0) + r.amount);
  return [...m].map(([type, total]) => ({ type, total })).sort((a, b) => b.total - a.total);
}
export const totalSpent = (d: Data, petId: string): number => d.records.filter((r) => r.petId === petId).reduce((n, r) => n + (r.amount ?? 0), 0);

/** Edad aproximada, en lenguaje de persona. */
export function ageLabel(birth: string, today: string): string {
  if (!parseYmd(birth)) return "";
  const days = toDayNumber(today) - toDayNumber(birth);
  if (days < 0) return "";
  if (days < 14) return days === 1 ? "1 día" : `${days} días`;
  if (days < 60) return `${Math.floor(days / 7)} semanas`;
  const b = parseYmd(birth)!, t = parseYmd(today)!;
  let months = (t.y - b.y) * 12 + (t.m - b.m) - (t.d < b.d ? 1 : 0);
  if (months < 24) return `${months} meses`;
  const years = Math.floor(months / 12); months -= years * 12;
  return months === 0 ? `${years} años` : `${years} años y ${months} ${months === 1 ? "mes" : "meses"}`;
}
export const kg = (g: number): string => (g / 1000).toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

/** Texto de la ficha compartible: solo datos que la persona registró. */
export function fichaText(d: Data, petId: string, today: string): string {
  const p = d.pets.find((x) => x.id === petId);
  if (!p) return "";
  const lines = [`Ficha de ${p.name}`, [p.species === "perro" ? "Perro" : "Gato", p.breed, p.sex, p.birth ? ageLabel(p.birth, today) : ""].filter(Boolean).join(" · ")];
  const w = weightSeries(d, petId).at(-1);
  if (w) lines.push(`Último peso: ${kg(w.grams)} kg (${w.date})`);
  const section = (title: string, type: RecType) => {
    const items = history(d, petId, type);
    if (items.length === 0) return;
    lines.push("", `${title}:`, ...items.slice(0, 8).map((r) => `- ${r.title}: ${r.date}${r.next ? ` (próxima: ${r.next})` : ""}`));
  };
  section("Vacunas", "vacuna"); section("Desparasitación", "desparasitacion"); section("Medicamentos registrados", "medicamento");
  if (p.notes) lines.push("", `Notas: ${p.notes}`);
  lines.push("", "Registro hecho por su familia en Huella al Día. No es un documento veterinario.");
  return lines.join("\n");
}

const q = (s: string | number) => `"${String(s).replace(/"/g, '""')}"`;
export function toCsv(d: Data, petId: string): string {
  const p = d.pets.find((x) => x.id === petId);
  return ["mascota,tipo,fecha,nombre,detalle,peso_g,valor,proxima,repite_meses", ...history(d, petId).map((r) => [p?.name ?? "", REC_LABEL[r.type], r.date, r.title, r.detail, r.weightG ?? "", r.amount ?? "", r.next ?? "", r.repeat ?? ""].map(q).join(","))].join("\n");
}

export function parseData(raw: unknown): Data | null {
  const r = raw as Data | null;
  if (!r || !Array.isArray(r.pets) || !Array.isArray(r.records) || !Number.isInteger(r.nextId) || typeof r.currency !== "string") return null;
  const pets = r.pets.filter((p) => p && typeof p.id === "string" && typeof p.name === "string" && (p.species === "perro" || p.species === "gato") && typeof p.breed === "string" && typeof p.birth === "string" && typeof p.photo === "string" && typeof p.notes === "string" && (p.sex === "" || p.sex === "macho" || p.sex === "hembra"));
  const ids = new Set(pets.map((p) => p.id));
  const records = r.records.filter((x) => x && typeof x.id === "string" && ids.has(x.petId) && REC_TYPES.includes(x.type) && parseYmd(x.date) && typeof x.title === "string" && typeof x.detail === "string" && (x.next === undefined || !!parseYmd(x.next)) && (x.weightG === undefined || Number.isSafeInteger(x.weightG)) && (x.amount === undefined || Number.isSafeInteger(x.amount)));
  return { pets, records, nextId: r.nextId, currency: r.currency };
}
export { addDays };
