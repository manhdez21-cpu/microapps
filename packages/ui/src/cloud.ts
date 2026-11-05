/**
 * Respaldo opcional en el Google Drive de la propia persona (carpeta privada de la app, permiso drive.appdata).
 * No hay servidor nuestro: no guardamos ni vemos nada. El script de Google se carga SOLO al tocar el botón, y el token vive solo en memoria.
 */
export const CLIENT_ID_RE = /^\d{6,20}-[a-z0-9]{10,40}\.apps\.googleusercontent\.com$/;
export const cloudEnabled = (clientId: unknown): clientId is string => typeof clientId === "string" && CLIENT_ID_RE.test(clientId);
export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.appdata";
const API = "https://www.googleapis.com/drive/v3/files";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3/files";
export const cloudFileName = (app: string): string => `respaldo-${app}.json`;

type Fetch = (url: string, init?: RequestInit) => Promise<Response>;
const authHeaders = (token: string) => ({ Authorization: `Bearer ${token}` });
async function ok(r: Response, what: string): Promise<Response> {
  if (r.ok) return r;
  if (r.status === 401 || r.status === 403) throw new Error("Google no autorizó el acceso. Vuelve a intentarlo y acepta el permiso.");
  throw new Error(`No se pudo ${what} (error ${r.status}).`);
}

/** Busca el respaldo de esta app en la carpeta privada. Devuelve null si no existe. */
export async function driveFind(token: string, app: string, f: Fetch = fetch): Promise<{ id: string; modifiedTime: string } | null> {
  const q = encodeURIComponent(`name='${cloudFileName(app)}'`);
  const r = await ok(await f(`${API}?spaces=appDataFolder&q=${q}&fields=files(id,modifiedTime)&pageSize=1`, { headers: authHeaders(token) }), "buscar el respaldo");
  const j = (await r.json()) as { files?: { id: string; modifiedTime: string }[] };
  return j.files?.[0] ?? null;
}
/** Crea o reemplaza el respaldo. */
export async function driveSave(token: string, app: string, text: string, f: Fetch = fetch): Promise<void> {
  const found = await driveFind(token, app, f);
  const meta = found ? { name: cloudFileName(app) } : { name: cloudFileName(app), parents: ["appDataFolder"] };
  const boundary = "mc" + Math.random().toString(36).slice(2);
  const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${text}\r\n--${boundary}--`;
  const url = found ? `${UPLOAD}/${found.id}?uploadType=multipart` : `${UPLOAD}?uploadType=multipart`;
  await ok(await f(url, { method: found ? "PATCH" : "POST", headers: { ...authHeaders(token), "Content-Type": `multipart/related; boundary=${boundary}` }, body }), "guardar el respaldo");
}
/** Descarga el texto del respaldo; null si no hay ninguno. */
export async function driveLoad(token: string, app: string, f: Fetch = fetch): Promise<{ text: string; modifiedTime: string } | null> {
  const found = await driveFind(token, app, f);
  if (!found) return null;
  const r = await ok(await f(`${API}/${found.id}?alt=media`, { headers: authHeaders(token) }), "descargar el respaldo");
  return { text: await r.text(), modifiedTime: found.modifiedTime };
}

declare const google: any;
let gis: Promise<void> | null = null;
function loadGis(): Promise<void> {
  if (typeof google !== "undefined" && google?.accounts?.oauth2) return Promise.resolve();
  gis ??= new Promise<void>((res, rej) => {
    const s = document.createElement("script"); s.src = "https://accounts.google.com/gsi/client"; s.async = true;
    s.onload = () => res(); s.onerror = () => { gis = null; rej(new Error("No se pudo conectar con Google. Revisa tu conexión.")); };
    document.head.appendChild(s);
  });
  return gis;
}
/** Pide permiso a Google (ventana de cuenta). El token no se guarda. */
export async function requestToken(clientId: string): Promise<string> {
  await loadGis();
  return new Promise<string>((res, rej) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: clientId, scope: DRIVE_SCOPE,
      callback: (r: { access_token?: string; error?: string }) => (r.access_token ? res(r.access_token) : rej(new Error("No se pudo iniciar sesión con Google."))),
      error_callback: () => rej(new Error("Se canceló el inicio de sesión de Google.")),
    });
    client.requestAccessToken({ prompt: "" });
  });
}
