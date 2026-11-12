// Emisión de licencias Pro (solo para el titular; nunca se publica la clave privada).
//   node tools/pro-license.mjs keygen
//       → imprime la clave pública (va en shared/pro/src/config.ts) y la privada (va SOLO en la variable PRO_PRIVATE_KEY).
//   PRO_PRIVATE_KEY=… node tools/pro-license.mjs sign --app splitflow --id PEDIDO-123 [--fecha 2026-11-12]
//       → imprime la licencia para enviar al comprador.
import { pathToFileURL } from "node:url";
import { ALG, SIG, LICENSE_PREFIX, b64urlDecode, b64urlEncode, parsePayload, signedBytes } from "../shared/pro/src/license.ts";

const { subtle } = globalThis.crypto;

/** Par de claves ECDSA P-256: pública (punto sin comprimir) y privada (PKCS#8), ambas en base64url. */
export async function generateKeys() {
  const pair = await subtle.generateKey(ALG, true, ["sign", "verify"]);
  return {
    publicKey: b64urlEncode(new Uint8Array(await subtle.exportKey("raw", pair.publicKey))),
    privateKey: b64urlEncode(new Uint8Array(await subtle.exportKey("pkcs8", pair.privateKey))),
  };
}

/** Firma una licencia. `payload` = { app, id, iat? }. Lanza si los datos no pasan el validador del cliente. */
export async function signLicense(payload, privateKeyB64) {
  const data = parsePayload({ v: 1, app: payload.app, id: payload.id, iat: payload.iat ?? new Date().toISOString().slice(0, 10) });
  if (!data) throw new Error("Datos de licencia no válidos: app debe ser una de las 4 apps Pro; id de 4 a 64 caracteres (letras, números, . _ -); fecha AAAA-MM-DD.");
  const der = b64urlDecode(privateKeyB64 ?? "");
  if (!der || der.length === 0) throw new Error("Falta la clave privada (variable de entorno PRO_PRIVATE_KEY).");
  const key = await subtle.importKey("pkcs8", der, ALG, false, ["sign"]);
  const body = b64urlEncode(new TextEncoder().encode(JSON.stringify(data)));
  const sig = new Uint8Array(await subtle.sign(SIG, key, signedBytes(body)));
  return `${LICENSE_PREFIX}.${body}.${b64urlEncode(sig)}`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [cmd, ...rest] = process.argv.slice(2);
  const arg = (name) => { const i = rest.indexOf(`--${name}`); return i >= 0 ? rest[i + 1] : undefined; };
  try {
    if (cmd === "keygen") {
      const k = await generateKeys();
      console.log(`Clave pública (pégala en PRO_PUBLIC_KEYS de shared/pro/src/config.ts):\n${k.publicKey}\n`);
      console.log(`Clave PRIVADA (guárdala solo como secreto PRO_PRIVATE_KEY; no la subas al repositorio ni la pegues en un chat):\n${k.privateKey}`);
    } else if (cmd === "sign") {
      console.log(await signLicense({ app: arg("app"), id: arg("id"), iat: arg("fecha") }, process.env.PRO_PRIVATE_KEY));
    } else {
      console.error("Uso: node tools/pro-license.mjs keygen | sign --app <app> --id <pedido> [--fecha AAAA-MM-DD]");
      process.exit(2);
    }
  } catch (e) { console.error(e.message); process.exit(1); }
}
