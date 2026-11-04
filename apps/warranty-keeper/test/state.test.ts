import { describe, it } from "node:test";
import { expect } from "../../../packages/core/test/expect.ts";
import { addWarranty, emptyData, endDate, parseData, removeWarranty, rows, search, setFile, toCsv, type Data } from "../src/state.ts";

const T = "2026-11-04";
const sample = (): Data => {
  let d = emptyData();
  d = addWarranty(d, { name: "Nevera", brand: "Samsung", model: "RT38", store: "Éxito", purchase: "2025-11-20", months: 12, note: "factura en el cajón" });
  d = addWarranty(d, { name: "Celular", brand: "Xiaomi", model: "Redmi 12", store: "Claro", purchase: "2024-01-31", months: 24 });
  d = addWarranty(d, { name: "TV", brand: "LG", store: "Alkosto", purchase: "2026-08-31", months: 36 });
  d = addWarranty(d, { name: "Licuadora", purchase: "2026-05-31", months: 6 });
  return d;
};
describe("warranty keeper", () => {
  it("fin de garantía con recorte de fin de mes", () => {
    expect(endDate({ purchase: "2025-08-31", months: 6 })).toBe("2026-02-28");
    expect(endDate({ purchase: "2026-08-31", months: 36 })).toBe("2029-08-31");
  });
  it("ordena vigentes por cercanía y terminadas al final", () => {
    const r = rows(sample(), T);
    expect(r.map((x) => x.w.name)).toEqual(["Nevera", "Licuadora", "TV", "Celular"]);
    expect([r[0]!.state, r[0]!.daysLeft, r[1]!.end, r[3]!.state]).toEqual(["soon", 16, "2026-11-30", "expired"]);
  });
  it("valida entradas", () => {
    expect(() => addWarranty(emptyData(), { name: "", purchase: "2026-01-01", months: 12 })).toThrow();
    expect(() => addWarranty(emptyData(), { name: "x", purchase: "2026-02-30", months: 12 })).toThrow();
    expect(() => addWarranty(emptyData(), { name: "x", purchase: "2026-01-01", months: 0 })).toThrow();
    expect(() => addWarranty(emptyData(), { name: "x", purchase: "2026-01-01", months: 2.5 })).toThrow();
    expect(removeWarranty(sample(), "w2").items.length).toBe(3);
  });
  it("búsqueda sin tildes en todos los campos y filtros por estado", () => {
    const all = rows(sample(), T);
    expect(search(all, "exito", "all").map((x) => x.w.name)).toEqual(["Nevera"]);
    expect(search(all, "samsung rt38", "all").length).toBe(1);
    expect(search(all, "FACTURA cajon", "all").length).toBe(1);
    expect(search(all, "", "ended").map((x) => x.w.name)).toEqual(["Celular"]);
    expect(search(all, "", "soon").map((x) => x.w.name)).toEqual(["Nevera", "Licuadora"]);
    expect(search(all, "", "active").length).toBe(3);
    expect(search(all, "zzz", "all").length).toBe(0);
  });
  it("adjunto, csv y parseData", () => {
    expect(setFile(sample(), "w1", "k").items[0]!.file).toBe("k");
    expect(toCsv(sample(), T).split("\n")[1]!.startsWith('"Nevera","Samsung","RT38"')).toBe(true);
    const bad = JSON.parse(JSON.stringify(sample())); bad.items.push({ id: "x", name: "a", brand: "", model: "", store: "", note: "", file: "", purchase: "2026-13-01", months: 1 });
    expect(parseData(bad)?.items.length).toBe(4);
    expect(parseData(null)).toBe(null);
  });
});
