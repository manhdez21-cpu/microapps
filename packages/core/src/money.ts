/** Dinero en unidades menores enteras (p. ej. centavos). Nunca floats. */
export type Minor = number;

export function assertMinor(value: number, label = "monto"): asserts value is Minor {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`${label} debe ser un entero seguro en unidades menores, recibido: ${value}`);
  }
}

/** Redondeo half-up (away from zero en empates) de num/den, den > 0. */
export function divRound(num: number, den: number): number {
  if (!Number.isSafeInteger(num) || !Number.isSafeInteger(den) || den <= 0) {
    throw new RangeError("divRound requiere enteros seguros y denominador > 0");
  }
  const sign = num < 0 ? -1 : 1;
  const n = BigInt(Math.abs(num));
  const d = BigInt(den);
  const q = (2n * n + d) / (2n * d);
  return sign * Number(q);
}

/** Aplica puntos básicos (1 bps = 0.01 %) a un monto, con redondeo half-up. */
export function applyBps(amount: Minor, bps: number): Minor {
  assertMinor(amount);
  if (!Number.isSafeInteger(bps)) throw new RangeError("bps debe ser entero");
  const product = BigInt(amount) * BigInt(bps);
  const sign = product < 0n ? -1 : 1;
  const abs = product < 0n ? -product : product;
  return sign * Number((2n * abs + 10000n) / 20000n);
}

/**
 * Reparte `total` proporcionalmente a `weights` (enteros ≥ 0, suma > 0)
 * con el método del mayor resto. La suma de las partes es EXACTAMENTE `total`.
 * Desempates por índice ascendente (determinista).
 */
export function allocate(total: Minor, weights: readonly number[]): Minor[] {
  assertMinor(total, "total");
  if (weights.length === 0) throw new RangeError("weights no puede estar vacío");
  let sum = 0n;
  for (const w of weights) {
    if (!Number.isSafeInteger(w) || w < 0) throw new RangeError("los pesos deben ser enteros ≥ 0");
    sum += BigInt(w);
  }
  if (sum === 0n) throw new RangeError("la suma de pesos debe ser > 0");

  const negative = total < 0;
  const abs = BigInt(Math.abs(total));
  const floors: bigint[] = [];
  const remainders: { i: number; r: bigint }[] = [];
  let assigned = 0n;
  weights.forEach((w, i) => {
    const prod = abs * BigInt(w);
    const f = prod / sum;
    floors.push(f);
    assigned += f;
    remainders.push({ i, r: prod % sum });
  });
  let left = Number(abs - assigned);
  remainders.sort((a, b) => (a.r === b.r ? a.i - b.i : a.r > b.r ? -1 : 1));
  const out = floors.map((f) => Number(f));
  for (let k = 0; k < left; k++) {
    const idx = remainders[k]!.i;
    out[idx] = out[idx]! + 1;
  }
  return negative ? out.map((v) => -v) : out;
}
