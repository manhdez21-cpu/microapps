/** Huella de carbono del hogar (CO2 por energía y combustibles). Estimación, no una medición. */
export interface Factor { id: "elec" | "gasoline" | "diesel" | "gas"; label: string; unit: string; /** kg CO2 por unidad; null = el usuario debe ponerlo */ kgPerUnit: number | null; source: string }

// Fuente: U.S. EIA, "Carbon Dioxide Emissions Coefficients" (tabla publicada 2024-09-18, consultada 2026-11-04):
// gasolina terminada 8,49 kg/gal; diésel (destilado) 10,19 kg/gal; gas natural 54,81 kg/mil pies³.
// Conversión: 1 gal US = 3,785411784 L; 1 mil pies³ = 28,316846592 m³.
const L_PER_GAL = 3.785411784, M3_PER_MCF = 28.316846592;
export const FACTORS: Factor[] = [
  { id: "elec", label: "Electricidad", unit: "kWh", kgPerUnit: null, source: "Depende de tu país y año: búscalo como «factor de emisión de la red eléctrica» de tu autoridad energética." },
  { id: "gasoline", label: "Gasolina", unit: "L", kgPerUnit: round(8.49 / L_PER_GAL, 4), source: "U.S. EIA, gasolina terminada: 8,49 kg CO₂/galón." },
  { id: "diesel", label: "Diésel", unit: "L", kgPerUnit: round(10.19 / L_PER_GAL, 4), source: "U.S. EIA, destilado: 10,19 kg CO₂/galón." },
  { id: "gas", label: "Gas natural", unit: "m³", kgPerUnit: round(54.81 / M3_PER_MCF, 4), source: "U.S. EIA: 54,81 kg CO₂/mil pies³." },
];
function round(n: number, d: number): number { const p = 10 ** d; return Math.round(n * p) / p; }

export interface Line { id: Factor["id"]; label: string; quantity: number; factor: number; kgMonth: number }
export type Outcome = { ok: true; lines: Line[]; kgMonth: number; kgYear: number; tonsYear: number } | { ok: false; error: string };

/** quantities/factors: texto tal como lo escribe la persona (coma o punto decimal). */
export function compute(quantities: Record<string, string>, factorOverrides: Record<string, string>, parse: (s: string) => number | null): Outcome {
  const lines: Line[] = [];
  for (const f of FACTORS) {
    const qText = (quantities[f.id] ?? "").trim();
    if (qText === "") continue;
    const q = parse(qText);
    if (q === null || q < 0) return { ok: false, error: `Revisa la cantidad de ${f.label.toLowerCase()}: debe ser un número igual o mayor que cero.` };
    const fText = (factorOverrides[f.id] ?? "").trim();
    let factor = f.kgPerUnit;
    if (fText !== "") { const v = parse(fText); if (v === null || v < 0) return { ok: false, error: `Revisa el factor de ${f.label.toLowerCase()}.` }; factor = v; }
    if (factor === null) return { ok: false, error: `Escribe el factor de emisión de ${f.label.toLowerCase()} (kg CO₂ por ${f.unit}); depende de tu país.` };
    lines.push({ id: f.id, label: f.label, quantity: q, factor, kgMonth: q * factor });
  }
  if (lines.length === 0) return { ok: false, error: "Escribe al menos un consumo mensual para calcular." };
  const kgMonth = lines.reduce((a, l) => a + l.kgMonth, 0);
  return { ok: true, lines, kgMonth, kgYear: kgMonth * 12, tonsYear: (kgMonth * 12) / 1000 };
}
