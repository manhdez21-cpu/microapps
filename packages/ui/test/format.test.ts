import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { currencyDigits, formatMoney, parseAmount, parsePercentToBps } from "../src/format.ts";

describe("parseAmount", () => {
  it("COP (0 decimales): separadores son miles", () => {
    assert.equal(parseAmount("12.500", 0), 12500);
    assert.equal(parseAmount("$ 1,250,000", 0), 1250000);
    assert.equal(parseAmount("45000", 0), 45000);
  });
  it("USD (2 decimales)", () => {
    assert.equal(parseAmount("12,50", 2), 1250);
    assert.equal(parseAmount("12.5", 2), 1250);
    assert.equal(parseAmount("1.234,56", 2), 123456);
    assert.equal(parseAmount("1,234.56", 2), 123456);
    assert.equal(parseAmount("1.500", 2), 150000);
    assert.equal(parseAmount("0,05", 2), 5);
  });
  it("inválidos", () => {
    assert.equal(parseAmount("", 2), null);
    assert.equal(parseAmount("abc", 2), null);
    assert.equal(parseAmount("0", 2), null);
    assert.equal(parseAmount("-5", 2), null);
  });
});

describe("parsePercentToBps", () => {
  it("convierte", () => {
    assert.equal(parsePercentToBps("33,33"), 3333);
    assert.equal(parsePercentToBps("50"), 5000);
    assert.equal(parsePercentToBps("100"), 10000);
    assert.equal(parsePercentToBps("0.5"), 50);
  });
  it("rechaza", () => {
    assert.equal(parsePercentToBps("101"), null);
    assert.equal(parsePercentToBps("12.345"), null);
    assert.equal(parsePercentToBps("x"), null);
  });
});

describe("moneda", () => {
  it("decimales por moneda", () => {
    assert.equal(currencyDigits("COP"), 0);
    assert.equal(currencyDigits("USD"), 2);
  });
  it("formatea para mostrar", () => {
    assert.match(formatMoney(1250, "USD", "en-US"), /12\.50/);
    assert.match(formatMoney(12500, "COP", "es-CO"), /12\.500/);
  });
});
