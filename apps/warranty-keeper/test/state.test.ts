import { describe, it } from "node:test";
import { expect } from "../../../packages/core/test/expect.ts";
import { addWarranty, emptyData, endDate, parseData, removeWarranty, rows, toCsv } from "../src/state.ts";

const T = "2026-11-04";
const sample = () => {
  let d = emptyData();
  d = addWarranty(d, "Nevera", "Éxito", "2025-11-20", 12, "factura en el cajón");
  d = addWarranty(d, "Celular", "Claro", "2024-01-31", 24, "");
  d = addWarranty(d, "TV", "Alkosto", "2026-08-31", 36, "");
  d = addWarranty(d, "Licuadora", "", "2026-05-31", 6, "");
  return d;
};
describe("warranty keeper", () => {
  it("calcula el fin con recorte de fin de mes", () => {
    expect(endDate({ purchase: "2025-08-31", months: 6 })).toBe("2026-02-28");
    expect(endDate({ purchase: "2026-08-31", months: 36 })).toBe("2029-08-31");
  });
  it("ordena vigentes por cercanía y vencidas al final", () => {
    const r = rows(sample(), T);
    expect(r.map((x) => x.w.name)).toEqual(["Nevera", "Licuadora", "TV", "Celular"]);
    expect(r[0].state).toBe("soon");
    expect(r[0].daysLeft).toBe(16);
    expect(r[1].end).toBe("2026-11-30");
    expect(r[3].state).toBe("expired");
  });
  it("valida entradas", () => {
    expect(() => addWarranty(emptyData(), "", "", "2026-01-01", 12, "")).toThrow();
    expect(() => addWarranty(emptyData(), "x", "", "2026-02-30", 12, "")).toThrow();
    expect(() => addWarranty(emptyData(), "x", "", "2026-01-01", 0, "")).toThrow();
    expect(() => addWarranty(emptyData(), "x", "", "2026-01-01", 2.5, "")).toThrow();
    expect(removeWarranty(sample(), "2").items.length).toBe(3);
  });
  it("csv y parseData", () => {
    expect(toCsv(sample(), T).split("\n").length).toBe(5);
    expect(parseData({ items: [{ id: "1", name: "a", store: "", note: "", purchase: "2026-01-01", months: 0 }], nextId: 2 })?.items.length).toBe(0);
    expect(parseData(null)).toBe(null);
  });
});
