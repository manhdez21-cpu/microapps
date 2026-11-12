/** Guardado local de las licencias (una por app). Tolera modo privado, cuota llena y datos corruptos. */
import { isProApp, type ProApp } from "./config.ts";

export const LICENSE_KEY = "chispatools.pro.v1";
export type KV = Pick<Storage, "getItem" | "setItem">;
export type Licenses = Partial<Record<ProApp, string>>;

const local = (): KV | null => { try { return globalThis.localStorage ?? null; } catch { return null; } };

export function parseLicenses(raw: unknown): Licenses {
  const out: Licenses = {};
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return out;
  for (const [k, v] of Object.entries(raw)) if (isProApp(k) && typeof v === "string" && v.length > 0 && v.length <= 600) out[k] = v;
  return out;
}
export function readLicenses(kv: KV | null = local()): Licenses {
  try { return parseLicenses(JSON.parse(kv?.getItem(LICENSE_KEY) ?? "null")); } catch { return {}; }
}
export function saveLicense(app: ProApp, token: string, kv: KV | null = local()): boolean {
  if (!kv) return false;
  try { kv.setItem(LICENSE_KEY, JSON.stringify({ ...readLicenses(kv), [app]: token })); return true; } catch { return false; }
}
export function removeLicense(app: ProApp, kv: KV | null = local()): boolean {
  if (!kv) return false;
  try { const all = readLicenses(kv); delete all[app]; kv.setItem(LICENSE_KEY, JSON.stringify(all)); return true; } catch { return false; }
}
