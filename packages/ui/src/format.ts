import type { Minor } from "../../core/src/index.ts";

const digitsCache = new Map<string, number>();

/** Decimales de la moneda (COP/JPY = 0, USD/EUR = 2). */
export function currencyDigits(currency: string): number {
  const cached = digitsCache.get(currency);
  if (cached !== undefined) return cached;
  const d = new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
  digitsCache.set(currency, d);
  return d;
}

/** Solo para mostrar. Los cálculos siempre usan enteros. */
export function formatMoney(minor: Minor, currency: string, locale = "es-CO"): string {
  const d = currencyDigits(currency);
  return new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: d, maximumFractionDigits: d }).format(
    minor / 10 ** d,
  );
}

/**
 * Convierte texto del usuario a unidades menores enteras, sin pasar por floats.
 * Acepta "12.500", "12,500", "1.234,56", "1,234.56". Devuelve null si no es válido o es ≤ 0.
 */
export function parseAmount(text: string, digits: number): Minor | null {
  if (/^\s*-/.test(text)) return null; // los gastos son positivos
  const s = text.replace(/[^\d.,]/g, "");
  if (s === "") return null;
  let intPart = s;
  let frac = "";
  if (digits > 0) {
    const idx = Math.max(s.lastIndexOf("."), s.lastIndexOf(","));
    if (idx >= 0) {
      const after = s.slice(idx + 1);
      if (after.length >= 1 && after.length <= digits) {
        intPart = s.slice(0, idx);
        frac = after;
      }
    }
  }
  intPart = intPart.replace(/[.,]/g, "");
  if (intPart === "") intPart = "0";
  const padded = frac.padEnd(digits, "0");
  const asText = (intPart + padded).replace(/^0+(?=\d)/, "");
  const n = Number(asText);
  if (!Number.isSafeInteger(n) || n <= 0) return null;
  return n;
}

/** Porcentaje en texto ("33,33") a puntos básicos enteros (3333). null si inválido o mayor que `maxBps` (por defecto 100 %). */
export function parsePercentToBps(text: string, maxBps = 10000): number | null {
  const s = text.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const [i, f = ""] = s.split(".");
  const bps = Number(i) * 100 + Number(f.padEnd(2, "0"));
  return bps >= 0 && bps <= maxBps ? bps : null;
}

/** Número decimal positivo con punto o coma ("2,5" → 2.5). null si inválido. */
export function parseDecimal(text: string): number | null {
  const s = text.trim().replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
