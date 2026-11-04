import { allocate, assertMinor, type Minor } from "./money.ts";

export type PersonId = string;

export interface Expense {
  id: string;
  paidBy: PersonId;
  amount: Minor;
  /** Cuánto debe cada participante de este gasto. Debe sumar `amount`. */
  shares: Record<PersonId, Minor>;
}

export interface Transfer {
  from: PersonId;
  to: PersonId;
  amount: Minor;
}

export function splitEqual(total: Minor, people: readonly PersonId[]): Record<PersonId, Minor> {
  assertUnique(people);
  const parts = allocate(total, people.map(() => 1));
  return toRecord(people, parts);
}

/** `bps` por persona; deben sumar 10000 (100 %). */
export function splitByPercent(
  total: Minor,
  percents: Readonly<Record<PersonId, number>>,
): Record<PersonId, Minor> {
  const people = Object.keys(percents);
  const bps = people.map((p) => percents[p]!);
  const sum = bps.reduce((a, b) => a + b, 0);
  if (sum !== 10000) throw new RangeError(`los porcentajes deben sumar 10000 bps, suman ${sum}`);
  return toRecord(people, allocate(total, bps));
}

/** Montos exactos por persona; deben sumar `total`. */
export function splitExact(
  total: Minor,
  amounts: Readonly<Record<PersonId, Minor>>,
): Record<PersonId, Minor> {
  assertMinor(total, "total");
  let sum = 0;
  for (const [p, a] of Object.entries(amounts)) {
    assertMinor(a, `monto de ${p}`);
    if (a < 0) throw new RangeError(`monto negativo para ${p}`);
    sum += a;
  }
  if (sum !== total) throw new RangeError(`los montos suman ${sum}, se esperaba ${total}`);
  return { ...amounts };
}

/** Saldo neto por persona: positivo = le deben; negativo = debe. Suma siempre 0. */
export function computeBalances(expenses: readonly Expense[]): Record<PersonId, Minor> {
  const balances: Record<PersonId, Minor> = {};
  const add = (p: PersonId, v: Minor) => {
    balances[p] = (balances[p] ?? 0) + v;
  };
  for (const e of expenses) {
    assertMinor(e.amount, `gasto ${e.id}`);
    if (e.amount < 0) throw new RangeError(`gasto ${e.id} negativo`);
    let owed = 0;
    for (const [p, s] of Object.entries(e.shares)) {
      assertMinor(s, `parte de ${p} en ${e.id}`);
      if (s < 0) throw new RangeError(`parte negativa en ${e.id}`);
      owed += s;
      add(p, -s);
    }
    if (owed !== e.amount) {
      throw new RangeError(`gasto ${e.id}: las partes suman ${owed} y el monto es ${e.amount}`);
    }
    add(e.paidBy, e.amount);
  }
  return balances;
}

/**
 * Liquidación voraz: empareja el mayor acreedor con el mayor deudor.
 * Garantiza ≤ (personas con saldo ≠ 0) − 1 transferencias. El mínimo exacto es NP-difícil;
 * este algoritmo no siempre alcanza el mínimo absoluto, pero es determinista y verificable.
 */
export function settle(balances: Readonly<Record<PersonId, Minor>>): Transfer[] {
  let total = 0;
  const creditors: { p: PersonId; v: Minor }[] = [];
  const debtors: { p: PersonId; v: Minor }[] = [];
  for (const [p, v] of Object.entries(balances)) {
    assertMinor(v, `saldo de ${p}`);
    total += v;
    if (v > 0) creditors.push({ p, v });
    else if (v < 0) debtors.push({ p, v: -v });
  }
  if (total !== 0) throw new RangeError(`los saldos deben sumar 0, suman ${total}`);

  const byValueThenId = (a: { p: string; v: number }, b: { p: string; v: number }) =>
    b.v - a.v || (a.p < b.p ? -1 : a.p > b.p ? 1 : 0);
  const out: Transfer[] = [];
  while (creditors.length > 0 && debtors.length > 0) {
    creditors.sort(byValueThenId);
    debtors.sort(byValueThenId);
    const c = creditors[0]!;
    const d = debtors[0]!;
    const amount = Math.min(c.v, d.v);
    out.push({ from: d.p, to: c.p, amount });
    c.v -= amount;
    d.v -= amount;
    if (c.v === 0) creditors.shift();
    if (d.v === 0) debtors.shift();
  }
  return out;
}

function assertUnique(people: readonly PersonId[]): void {
  if (people.length === 0) throw new RangeError("se necesita al menos una persona");
  if (new Set(people).size !== people.length) throw new RangeError("participantes duplicados");
}

function toRecord(people: readonly PersonId[], parts: readonly Minor[]): Record<PersonId, Minor> {
  const out: Record<PersonId, Minor> = {};
  people.forEach((p, i) => {
    out[p] = parts[i]!;
  });
  return out;
}
