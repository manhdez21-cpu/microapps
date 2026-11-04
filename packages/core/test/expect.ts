// Mini "expect" sobre node:assert (compatible con la sintaxis de vitest/jest para migrar luego).
import assert from "node:assert/strict";

export function expect(actual: unknown) {
  return {
    toBe: (e: unknown) => assert.strictEqual(actual, e),
    toEqual: (e: unknown) => assert.deepStrictEqual(actual, e),
    toThrow: () => assert.throws(actual as () => unknown),
    toBeLessThan: (e: number) => assert.ok((actual as number) < e, `${actual} no es < ${e}`),
    toBeLessThanOrEqual: (e: number) => assert.ok((actual as number) <= e, `${actual} no es <= ${e}`),
    toBeGreaterThanOrEqual: (e: number) => assert.ok((actual as number) >= e, `${actual} no es >= ${e}`),
    toBeCloseTo: (e: number, digits = 2) =>
      assert.ok(Math.abs((actual as number) - e) < 10 ** -digits / 2, `${actual} no está cerca de ${e}`),
  };
}
