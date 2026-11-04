import { describe, it } from "node:test";
import { expect } from "../../../packages/core/test/expect.ts";
import { addItem, emptyData, group, parseData, removeItem, setWarnDays, toCsv } from "../src/state.ts";

const T = "2026-11-04";
const sample = () => {
  let d = emptyData();
  d = addItem(d, "Leche", "2026-11-03", "Nevera");
  d = addItem(d, "Yogur", "2026-11-04", "Nevera");
  d = addItem(d, "Pan", "2026-11-09", "");
  d = addItem(d, "Arroz", "2027-03-01", "Despensa");
  d = addItem(d, "Atún", "2026-11-06", "Despensa");
  return d;
};
describe("expiryhub", () => {
  it("agrupa por urgencia y ordena", () => {
    const g = group(sample(), T);
    expect(g.map((x) => x.state)).toEqual(["expired", "today", "soon", "later"]);
    expect(g[2].items.map((x) => x.item.name)).toEqual(["Atún", "Pan"]);
    expect(g[0].items[0].daysLeft).toBe(-1);
  });
  it("el aviso cambia el grupo", () => {
    const g = group(setWarnDays(sample(), 2), T);
    expect(g.find((x) => x.state === "soon")?.items.map((x) => x.item.name)).toEqual(["Atún"]);
  });
  it("valida entradas", () => {
    expect(() => addItem(emptyData(), " ", "2026-11-04", "")).toThrow();
    expect(() => addItem(emptyData(), "x", "2026-02-30", "")).toThrow();
    expect(() => setWarnDays(emptyData(), 0)).toThrow();
    expect(removeItem(sample(), "1").items.length).toBe(4);
  });
  it("csv y parseData", () => {
    expect(toCsv(sample(), T).split("\n").length).toBe(6);
    const bad = { items: [{ id: "1", name: "a", place: "", expiry: "2026-13-01" }, { id: "2", name: "b", place: "", expiry: "2026-12-01" }], warnDays: 7, nextId: 3 };
    expect(parseData(bad)?.items.length).toBe(1);
    expect(parseData({ items: 1 })).toBe(null);
  });
});
