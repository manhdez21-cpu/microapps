import { describe, it } from "node:test";
import { expect } from "./expect.ts";
import { addDays, addMonths, daysBetween, dueInfo, parseYmd } from "../src/dates.ts";

describe("dates", () => {
  it("valida fechas", () => {
    expect(parseYmd("2026-02-29")).toBe(null);
    expect(parseYmd("2028-02-29")).toEqual({ y: 2028, m: 2, d: 29 });
    expect(parseYmd("2026-13-01")).toBe(null);
    expect(parseYmd("26-1-1")).toBe(null);
  });
  it("daysBetween y addDays", () => {
    expect(daysBetween("2026-11-04", "2026-11-05")).toBe(1);
    expect(daysBetween("2026-12-31", "2027-01-01")).toBe(1);
    expect(daysBetween("2026-11-04", "2026-10-31")).toBe(-4);
    expect(addDays("2026-02-27", 2)).toBe("2026-03-01");
    expect(addDays("2028-02-27", 2)).toBe("2028-02-29");
  });
  it("addMonths recorta al fin de mes", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2028-01-31", 1)).toBe("2028-02-29");
    expect(addMonths("2026-11-15", 12)).toBe("2027-11-15");
    expect(addMonths("2026-01-15", -2)).toBe("2025-11-15");
    expect(addMonths("2026-03-31", 24)).toBe("2028-03-31");
  });
  it("dueInfo clasifica", () => {
    expect(dueInfo("2026-11-04", "2026-11-03", 7)).toEqual({ state: "expired", daysLeft: -1 });
    expect(dueInfo("2026-11-04", "2026-11-04", 7)).toEqual({ state: "today", daysLeft: 0 });
    expect(dueInfo("2026-11-04", "2026-11-11", 7)).toEqual({ state: "soon", daysLeft: 7 });
    expect(dueInfo("2026-11-04", "2026-11-12", 7)).toEqual({ state: "ok", daysLeft: 8 });
  });
});
