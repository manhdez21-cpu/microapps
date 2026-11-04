import { describe, it } from "node:test";
import { expect } from "../../../packages/core/test/expect.ts";
import type { Form } from "../src/calc.ts";
import { addQuote, makeQuote, parseQuotes, quoteText, removeQuote, scenarios } from "../src/quotes.ts";

const F: Form = { currency: "COP", materials: "80000", hours: "", rate: "", transport: "", overhead: "", commissionPct: "", goal: "margin", goalPct: "20", taxPct: "19" };
const money = (m: number) => `$${m}`;
describe("cotizaciones y escenarios", () => {
  it("escenarios de margen suben el precio y la ganancia", () => {
    const s = scenarios(F);
    expect(s.map((x) => x.marginPct)).toEqual([10, 20, 30, 40, 50]);
    expect(s[1]!.gross).toBe(119000); // 80000 / 0,8 = 100000 + 19 %
    expect(s[0]!.gross < s[1]!.gross && s[1]!.gross < s[4]!.gross).toBe(true);
    expect(scenarios({ ...F, commissionPct: "60" }, [10, 50]).length).toBe(1);
  });
  it("crea, reemplaza y quita cotizaciones; valida", () => {
    const q = makeQuote(F, { client: "Doña Marta", job: "Pintura sala", days: 10, note: "Incluye materiales" }, "q1", "2026-11-04T10:00:00Z");
    expect([q.gross, q.tax, q.days]).toEqual([119000, 19000, 10]);
    expect(() => makeQuote(F, { client: "", job: " ", days: 10, note: "" }, "q", "x")).toThrow();
    expect(() => makeQuote({ ...F, materials: "" }, { client: "", job: "x", days: 10, note: "" }, "q", "x")).toThrow();
    expect(makeQuote(F, { client: "", job: "x", days: 0, note: "" }, "q", "x").days).toBe(15);
    const l = addQuote(addQuote([], q), { ...q, job: "Nuevo" });
    expect(l.length).toBe(1);
    expect(removeQuote(l, "q1").length).toBe(0);
  });
  it("el texto para el cliente no revela costos ni margen", () => {
    const t = quoteText(makeQuote(F, { client: "Marta", job: "Pintura", days: 10, note: "Pago 50 % anticipo" }, "q1", "2026-11-04T10:00:00Z"), money, "Juan Pérez");
    expect(t.includes("Valor total: $119000")).toBe(true);
    expect(t.includes("Marta") && t.includes("Juan Pérez") && t.includes("10 días")).toBe(true);
    expect(/margen|costo|ganancia/i.test(t)).toBe(false);
  });
  it("parseQuotes descarta registros dañados", () => {
    const good = makeQuote(F, { client: "", job: "x", days: 5, note: "" }, "q1", "2026-11-04T10:00:00Z");
    const out = parseQuotes([good, { id: 1 }, { ...good, form: { ...good.form, materials: "abc" } }, null]);
    expect(out?.length).toBe(1);
    expect(parseQuotes({})).toBe(null);
  });
});
