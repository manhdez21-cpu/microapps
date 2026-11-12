/** Estado Pro en memoria: se llena al verificar la licencia guardada (initPro) o al activar una nueva. */
import { PRO_PUBLIC_KEYS, type ProApp } from "./config.ts";
import { cleanToken, verifyLicense, type VerifyError } from "./license.ts";
import { readLicenses, removeLicense, saveLicense, type KV } from "./store.ts";

export interface ProDeps { keys?: readonly string[]; kv?: KV | null; subtle?: SubtleCrypto | null }
const verified = new Set<ProApp>();
const listeners = new Set<(app: ProApp) => void>();
let current: ProApp | null = null;

const notify = (app: ProApp): void => { for (const fn of [...listeners]) { try { fn(app); } catch { /* un oyente roto no bloquea al resto */ } } };
const check = (token: string, app: ProApp, d: ProDeps) => (d.subtle === undefined ? verifyLicense(token, app, d.keys ?? PRO_PUBLIC_KEYS) : verifyLicense(token, app, d.keys ?? PRO_PUBLIC_KEYS, d.subtle));

/** App en la que se está (la fija initPro). */
export const currentApp = (): ProApp | null => current;

/** Al arrancar la app: verifica la licencia guardada. Devuelve si es Pro. Nunca lanza. */
export async function initPro(app: ProApp, deps: ProDeps = {}): Promise<boolean> {
  current = app;
  const token = (deps.kv === undefined ? readLicenses() : readLicenses(deps.kv))[app];
  const was = verified.has(app);
  const ok = token ? (await check(token, app, deps)).ok : false;
  if (ok) verified.add(app); else verified.delete(app);
  if (ok !== was) notify(app);
  return ok;
}

/** Síncrono: verdadero solo si una licencia de esa app ya pasó la verificación de firma en esta sesión. */
export function isPro(app: ProApp | null = current): boolean {
  return app !== null && verified.has(app);
}

export type ActivateResult = { ok: true; stored: boolean } | { ok: false; error: VerifyError };
/** Verifica una licencia pegada por la persona y, si es válida, la guarda en el dispositivo. */
export async function activateLicense(app: ProApp, token: string, deps: ProDeps = {}): Promise<ActivateResult> {
  const clean = cleanToken(token);
  const res = await check(clean, app, deps);
  if (!res.ok) return res;
  const stored = deps.kv === undefined ? saveLicense(app, clean) : saveLicense(app, clean, deps.kv);
  const was = verified.has(app);
  verified.add(app);
  if (!was) notify(app);
  return { ok: true, stored };
}

/** Quita la licencia de este dispositivo (la licencia sigue siendo válida: se puede volver a pegar). */
export function deactivateLicense(app: ProApp, deps: ProDeps = {}): void {
  if (deps.kv === undefined) removeLicense(app); else removeLicense(app, deps.kv);
  if (verified.delete(app)) notify(app);
}

/** Avisa cuando una app pasa a Pro o deja de serlo (para volver a dibujar). Devuelve cómo dejar de escuchar. */
export function onProChange(fn: (app: ProApp) => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export const ERROR_TEXT: Record<VerifyError, string> = {
  formato: "Esa licencia no tiene el formato correcto. Cópiala completa, tal como te llegó.",
  app: "Esa licencia es de otra app de ChispaTools. Ábrela en la app que compraste.",
  firma: "No pudimos validar esa licencia. Revisa que esté completa o escríbenos.",
  "sin-clave": "La activación todavía no está disponible en esta versión.",
  "no-soportado": "Este navegador no puede validar la licencia. Abre la app desde https://chispatools.com en un navegador actualizado.",
};
