/**
 * Licencia firmada que se verifica sin servidor: `CT1.<datos>.<firma>` (base64url).
 * Firma ECDSA P-256 + SHA-256 (WebCrypto). El cliente solo tiene la clave pública: puede comprobar, no emitir.
 */
import { isProApp, type ProApp } from "./config.ts";

export const LICENSE_PREFIX = "CT1";
export interface LicensePayload { v: 1; app: ProApp; id: string; iat: string }
export type VerifyError = "formato" | "app" | "firma" | "sin-clave" | "no-soportado";
export type VerifyResult = { ok: true; payload: LicensePayload } | { ok: false; error: VerifyError };

export const ALG = { name: "ECDSA", namedCurve: "P-256" } as const;
export const SIG = { name: "ECDSA", hash: "SHA-256" } as const;

export function b64urlEncode(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export function b64urlDecode(text: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[A-Za-z0-9_-]*$/.test(text) || text.length % 4 === 1) return null;
  try {
    const bin = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
    const out = new Uint8Array(new ArrayBuffer(bin.length));
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch { return null; }
}

/** Validador propio del contenido de la licencia: solo las 4 claves esperadas y con su forma exacta. */
export function parsePayload(raw: unknown): LicensePayload | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (Object.keys(o).length !== 4 || o.v !== 1 || !isProApp(o.app)) return null;
  if (typeof o.id !== "string" || !/^[A-Za-z0-9._-]{4,64}$/.test(o.id)) return null;
  if (typeof o.iat !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(o.iat) || Number.isNaN(Date.parse(o.iat))) return null;
  return { v: 1, app: o.app, id: o.id, iat: o.iat };
}

/** Quita espacios y saltos de línea que añaden el correo o WhatsApp al copiar. */
export const cleanToken = (text: string): string => text.replace(/\s+/g, "");

/** Texto exacto que se firma: prefijo + datos, para que una firma no sirva con otro formato. */
export const signedBytes = (body: string): Uint8Array<ArrayBuffer> => new TextEncoder().encode(`${LICENSE_PREFIX}.${body}`) as Uint8Array<ArrayBuffer>;

const subtleOrNull = (): SubtleCrypto | null => { try { return globalThis.crypto?.subtle ?? null; } catch { return null; } };

/**
 * Comprueba una licencia para una app. Nunca lanza: cualquier fallo devuelve `ok: false`.
 * Sin WebCrypto (p. ej. página sin https) o sin clave pública configurada, nadie es Pro.
 */
export async function verifyLicense(token: string, app: ProApp, publicKeys: readonly string[], subtle: SubtleCrypto | null = subtleOrNull()): Promise<VerifyResult> {
  const parts = cleanToken(token).split(".");
  if (parts.length !== 3 || parts[0] !== LICENSE_PREFIX) return { ok: false, error: "formato" };
  const body = parts[1]!, sig = b64urlDecode(parts[2]!), bodyBytes = b64urlDecode(body);
  if (!bodyBytes || !sig || sig.length !== 64) return { ok: false, error: "formato" };
  let payload: LicensePayload | null = null;
  try { payload = parsePayload(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bodyBytes))); } catch { payload = null; }
  if (!payload) return { ok: false, error: "formato" };
  if (payload.app !== app) return { ok: false, error: "app" };
  if (publicKeys.length === 0) return { ok: false, error: "sin-clave" };
  if (!subtle) return { ok: false, error: "no-soportado" };
  for (const k of publicKeys) {
    try {
      const raw = b64urlDecode(k);
      if (!raw) continue;
      const key = await subtle.importKey("raw", raw, ALG, false, ["verify"]);
      if (await subtle.verify(SIG, key, sig, signedBytes(body))) return { ok: true, payload };
    } catch { /* clave mal formada: se prueba la siguiente */ }
  }
  return { ok: false, error: "firma" };
}
