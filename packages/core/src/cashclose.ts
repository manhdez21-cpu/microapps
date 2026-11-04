import { assertMinor, type Minor } from "./money.ts";

export type MovementType =
  | "cash_sale"
  | "card_sale"
  | "transfer_sale"
  | "credit_sale" // venta fiada: NO entra a caja
  | "credit_payment_cash" // cobro de fiado en efectivo: SÍ entra a caja
  | "expense_cash"
  | "withdrawal_cash"
  | "deposit_cash";

export interface Movement {
  id: string;
  type: MovementType;
  /** Monto positivo en unidades menores */
  amount: Minor;
  note?: string;
}

export interface CloseInput {
  openingCash: Minor;
  movements: readonly Movement[];
  /** Efectivo contado físicamente al cierre */
  countedCash: Minor;
}

export interface CloseResult {
  expectedCash: Minor;
  countedCash: Minor;
  /** contado − esperado. Negativo = faltante; positivo = sobrante */
  difference: Minor;
  totals: {
    cashSales: Minor;
    cardSales: Minor;
    transferSales: Minor;
    creditSales: Minor;
    creditPaymentsCash: Minor;
    expensesCash: Minor;
    withdrawalsCash: Minor;
    depositsCash: Minor;
    totalSales: Minor;
  };
}

export function closeCashRegister(input: CloseInput): CloseResult {
  assertMinor(input.openingCash, "fondo inicial");
  assertMinor(input.countedCash, "efectivo contado");
  if (input.openingCash < 0 || input.countedCash < 0) throw new RangeError("montos de caja no pueden ser negativos");

  const t = {
    cashSales: 0,
    cardSales: 0,
    transferSales: 0,
    creditSales: 0,
    creditPaymentsCash: 0,
    expensesCash: 0,
    withdrawalsCash: 0,
    depositsCash: 0,
    totalSales: 0,
  };
  const seen = new Set<string>();
  for (const m of input.movements) {
    if (seen.has(m.id)) throw new RangeError(`movimiento duplicado: ${m.id}`);
    seen.add(m.id);
    assertMinor(m.amount, `movimiento ${m.id}`);
    if (m.amount <= 0) throw new RangeError(`el monto del movimiento ${m.id} debe ser > 0`);
    switch (m.type) {
      case "cash_sale":
        t.cashSales += m.amount;
        break;
      case "card_sale":
        t.cardSales += m.amount;
        break;
      case "transfer_sale":
        t.transferSales += m.amount;
        break;
      case "credit_sale":
        t.creditSales += m.amount;
        break;
      case "credit_payment_cash":
        t.creditPaymentsCash += m.amount;
        break;
      case "expense_cash":
        t.expensesCash += m.amount;
        break;
      case "withdrawal_cash":
        t.withdrawalsCash += m.amount;
        break;
      case "deposit_cash":
        t.depositsCash += m.amount;
        break;
      default: {
        const never: never = m.type;
        throw new RangeError(`tipo desconocido: ${String(never)}`);
      }
    }
  }
  t.totalSales = t.cashSales + t.cardSales + t.transferSales + t.creditSales;
  const expectedCash =
    input.openingCash + t.cashSales + t.creditPaymentsCash + t.depositsCash - t.expensesCash - t.withdrawalsCash;
  return {
    expectedCash,
    countedCash: input.countedCash,
    difference: input.countedCash - expectedCash,
    totals: t,
  };
}
