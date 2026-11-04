import {
  allocate,
  computeBalances,
  settle,
  splitByPercent,
  splitEqual,
  splitExact,
  type Expense,
  type Minor,
  type Transfer,
} from "../../../packages/core/src/index.ts";

export type SplitMode = "equal" | "percent" | "exact";

export interface Person {
  id: string;
  name: string;
}

export interface ExpenseRec {
  id: string;
  description: string;
  paidBy: string;
  amount: Minor;
  date: string;
  mode: SplitMode;
  shares: Record<string, Minor>;
}

export interface Group {
  id: string;
  name: string;
  currency: string;
  people: Person[];
  expenses: ExpenseRec[];
  createdAt: string;
}

export interface State {
  version: 1;
  groups: Group[];
  activeId: string | null;
}

export const emptyState = (): State => ({ version: 1, groups: [], activeId: null });

const uid = (): string => crypto.randomUUID();

export function newGroup(name: string, currency: string, now = new Date().toISOString(), id = uid()): Group {
  const clean = name.trim();
  if (clean === "") throw new RangeError("El grupo necesita un nombre.");
  return { id, name: clean, currency, people: [], expenses: [], createdAt: now };
}

export function addPerson(g: Group, name: string, id = uid()): Group {
  const clean = name.trim().replace(/\s+/g, " ");
  if (clean === "") throw new RangeError("Escribe un nombre.");
  if (g.people.some((p) => p.name.toLowerCase() === clean.toLowerCase())) {
    throw new RangeError(`Ya existe ${clean} en este grupo.`);
  }
  return { ...g, people: [...g.people, { id, name: clean }] };
}

export function removePerson(g: Group, personId: string): Group {
  const used = g.expenses.some((e) => e.paidBy === personId || (e.shares[personId] ?? 0) > 0);
  if (used) throw new RangeError("No se puede quitar a alguien que participa en gastos. Borra esos gastos primero.");
  return { ...g, people: g.people.filter((p) => p.id !== personId) };
}

export interface ExpenseInput {
  description: string;
  amount: Minor;
  paidBy: string;
  mode: SplitMode;
  participants: readonly string[];
  /** bps por persona (modo percent) */
  percents?: Readonly<Record<string, number>>;
  /** montos exactos por persona (modo exact) */
  exacts?: Readonly<Record<string, Minor>>;
  date?: string;
}

export function addExpense(g: Group, input: ExpenseInput, id = uid()): Group {
  const description = input.description.trim();
  if (description === "") throw new RangeError("Describe el gasto.");
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0) throw new RangeError("El monto debe ser mayor que 0.");
  const known = new Set(g.people.map((p) => p.id));
  if (!known.has(input.paidBy)) throw new RangeError("Elige quién pagó.");
  if (input.participants.length === 0) throw new RangeError("Elige al menos un participante.");
  for (const p of input.participants) if (!known.has(p)) throw new RangeError("Participante desconocido.");

  let shares: Record<string, Minor>;
  if (input.mode === "equal") {
    shares = splitEqual(input.amount, input.participants);
  } else if (input.mode === "percent") {
    const pct: Record<string, number> = {};
    for (const p of input.participants) pct[p] = input.percents?.[p] ?? 0;
    const sum = Object.values(pct).reduce((a, b) => a + b, 0);
    if (sum !== 10000) throw new RangeError(`Los porcentajes suman ${(sum / 100).toFixed(2)} %, deben sumar 100 %.`);
    shares = splitByPercent(input.amount, pct);
  } else {
    const ex: Record<string, Minor> = {};
    for (const p of input.participants) ex[p] = input.exacts?.[p] ?? 0;
    const sum = Object.values(ex).reduce((a, b) => a + b, 0);
    if (sum !== input.amount) throw new RangeError("Los montos por persona deben sumar exactamente el total del gasto.");
    shares = splitExact(input.amount, ex);
  }
  // Solo guarda partes > 0 (un participante con 0 no debe nada).
  const nonZero: Record<string, Minor> = {};
  for (const [p, v] of Object.entries(shares)) if (v > 0) nonZero[p] = v;

  const rec: ExpenseRec = {
    id,
    description,
    paidBy: input.paidBy,
    amount: input.amount,
    date: input.date ?? new Date().toISOString().slice(0, 10),
    mode: input.mode,
    shares: nonZero,
  };
  return { ...g, expenses: [rec, ...g.expenses] };
}

export function removeExpense(g: Group, expenseId: string): Group {
  return { ...g, expenses: g.expenses.filter((e) => e.id !== expenseId) };
}

export interface Summary {
  balances: Record<string, Minor>;
  transfers: Transfer[];
  total: Minor;
}

export function summarize(g: Group): Summary {
  const expenses: Expense[] = g.expenses.map((e) => ({
    id: e.id,
    paidBy: e.paidBy,
    amount: e.amount,
    shares: e.shares,
  }));
  const balances = computeBalances(expenses);
  for (const p of g.people) if (balances[p.id] === undefined) balances[p.id] = 0;
  return { balances, transfers: settle(balances), total: g.expenses.reduce((a, e) => a + e.amount, 0) };
}

/** CSV con una fila por gasto (comillas escapadas; monto en unidades menores y en decimal). */
export function toCsv(g: Group, digits: number): string {
  const name = (id: string) => g.people.find((p) => p.id === id)?.name ?? id;
  const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const dec = (m: Minor) => (m / 10 ** digits).toFixed(digits);
  const rows = [["fecha", "descripcion", "pago", "monto", "reparto"].map(q).join(",")];
  for (const e of [...g.expenses].reverse()) {
    const reparto = Object.entries(e.shares)
      .map(([p, v]) => `${name(p)}: ${dec(v)}`)
      .join("; ");
    rows.push([q(e.date), q(e.description), q(name(e.paidBy)), dec(e.amount), q(reparto)].join(","));
  }
  return rows.join("\n");
}

/** Valida un estado leído de almacenamiento; null si no es confiable. */
export function parseState(raw: unknown): State | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Partial<State>;
  if (r.version !== 1 || !Array.isArray(r.groups)) return null;
  const groups: Group[] = [];
  for (const g of r.groups as Group[]) {
    if (
      typeof g?.id !== "string" ||
      typeof g.name !== "string" ||
      typeof g.currency !== "string" ||
      !Array.isArray(g.people) ||
      !Array.isArray(g.expenses)
    ) {
      return null;
    }
    const ok = g.expenses.every(
      (e) => Number.isSafeInteger(e.amount) && typeof e.paidBy === "string" && typeof e.shares === "object" && e.shares !== null,
    );
    if (!ok) return null;
    groups.push(g);
  }
  const activeId = typeof r.activeId === "string" && groups.some((g) => g.id === r.activeId) ? r.activeId : groups[0]?.id ?? null;
  return { version: 1, groups, activeId };
}

/** Reparte un total entre N pagadores en partes iguales (utilidad para la UI de porcentajes iguales). */
export function equalPercents(ids: readonly string[]): Record<string, number> {
  const parts = allocate(10000, ids.map(() => 1));
  const out: Record<string, number> = {};
  ids.forEach((id, i) => {
    out[id] = parts[i]!;
  });
  return out;
}
