import { getFile, putFile } from "./blobs.ts";
import { h } from "./dom.ts";
import { backupState, cloudEnabled, driveLoad, driveSave, fingerprint, requestToken, sessionToken, sinceText } from "./cloud.ts";

/** Respaldo en un archivo .json: copia de los datos de la app (y de sus adjuntos) para cambiar de teléfono o recuperar datos borrados. */
export interface Backup { app: string; version: 1; exportedAt: string; data: Record<string, string>; blobs: Record<string, string> }
const MAX_BYTES = 25 * 1024 * 1024;

export function encodeBackup(app: string, data: Record<string, string>, blobs: Record<string, string>, now = new Date()): string {
  const b: Backup = { app, version: 1, exportedAt: now.toISOString(), data, blobs };
  return JSON.stringify(b);
}
/** Valida el archivo: debe ser de la misma app y solo trae las claves permitidas, con JSON válido. Nunca escribe nada. */
export function decodeBackup(text: string, app: string, allowedKeys: readonly string[]): Backup {
  if (text.length > MAX_BYTES) throw new Error("El archivo es demasiado grande.");
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { throw new Error("Ese archivo no es un respaldo válido."); }
  const b = raw as Backup | null;
  if (!b || typeof b !== "object" || b.version !== 1 || typeof b.app !== "string" || typeof b.data !== "object" || b.data === null) throw new Error("Ese archivo no es un respaldo válido.");
  if (b.app !== app) throw new Error(`Ese respaldo es de otra app (${String(b.app).slice(0, 30)}).`);
  const data: Record<string, string> = {};
  for (const [k, v] of Object.entries(b.data)) {
    if (!allowedKeys.includes(k) || typeof v !== "string") continue;
    try { JSON.parse(v); } catch { throw new Error("El respaldo tiene datos dañados."); }
    data[k] = v;
  }
  if (Object.keys(data).length === 0) throw new Error("El respaldo no trae datos de esta app.");
  const blobs: Record<string, string> = {};
  if (b.blobs && typeof b.blobs === "object") for (const [k, v] of Object.entries(b.blobs)) if (typeof v === "string" && v.startsWith("data:") && /^[\w-]{1,60}$/.test(k)) blobs[k] = v;
  return { app, version: 1, exportedAt: String(b.exportedAt ?? ""), data, blobs };
}

const toDataUrl = (blob: Blob) => new Promise<string>((ok, bad) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = () => bad(new Error("No se pudo leer un adjunto.")); r.readAsDataURL(blob); });

export interface BackupOptions { app: string; keys: readonly string[]; /** Claves de adjuntos (IndexedDB) que dependen de los datos actuales. */ blobKeys?: () => string[]; fileName?: string }
export async function createBackup(o: BackupOptions): Promise<string> {
  const data: Record<string, string> = {};
  for (const k of o.keys) { const v = localStorage.getItem(k); if (v !== null) data[k] = v; }
  const blobs: Record<string, string> = {};
  for (const k of o.blobKeys?.() ?? []) { try { const b = await getFile(k); if (b) blobs[k] = await toDataUrl(b); } catch { /* adjunto ausente: se omite */ } }
  return encodeBackup(o.app, data, blobs);
}
export async function applyBackup(text: string, o: BackupOptions): Promise<number> {
  const b = decodeBackup(text, o.app, o.keys);
  for (const [k, v] of Object.entries(b.data)) localStorage.setItem(k, v);
  let n = 0;
  for (const [k, url] of Object.entries(b.blobs)) { try { await putFile(k, await (await fetch(url)).blob()); n++; } catch { /* sigue con los demás */ } }
  return n;
}

/** Panel desplegable «Respaldo»: descargar y restaurar. Al restaurar recarga la página para leer los datos nuevos. */
export function backupPanel(o: BackupOptions): HTMLElement {
  const status = h("p", { class: "hint", role: "status", "data-testid": "backup-status" });
  const say = (t: string) => { status.textContent = t; };
  mountCloudCard(o);
  return h("details", { class: "backup", "data-testid": "backup" },
    h("summary", {}, "Respaldo de tus datos"),
    h("p", { class: "hint" }, "Tus datos viven solo en este navegador. Descarga un respaldo para guardarlo o pasarlo a otro teléfono, y restáuralo aquí cuando lo necesites."),
    h("div", { class: "actions" },
      h("button", { type: "button", onClick: async () => {
        try {
          const text = await createBackup(o);
          const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
          const a = h("a", { href: url, download: o.fileName ?? `respaldo-${o.app}.json` }); document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
          markBackup(o); say("Respaldo descargado."); refreshCard();
        } catch (e) { say((e as Error).message); }
      } }, "Descargar respaldo"),
      h("label", { class: "button attach" }, "Restaurar respaldo", h("input", { type: "file", accept: "application/json,.json", "data-testid": "backup-file", onChange: async (e: Event) => {
        const input = e.target as HTMLInputElement; const f = input.files?.[0]; input.value = "";
        if (!f) return;
        try { await applyBackup(await f.text(), o); say("Respaldo restaurado. Recargando…"); setTimeout(() => location.reload(), 400); }
        catch (err) { say((err as Error).message); }
      } }))),
    status);
}

/** Último respaldo (archivo o Drive) y huella de los datos en ese momento, para avisar de cambios sin respaldar. */
const lastKey = (app: string) => `microapps.backup.v1.${app}`;
const autoKey = (app: string) => `microapps.autosave.v1.${app}`;
const safeGet = (k: string): string | null => { try { return localStorage.getItem(k); } catch { return null; } };
const safeSet = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } };
const currentFp = (o: BackupOptions) => fingerprint(o.keys.map((k) => safeGet(k)));
const readLast = (app: string): { t: string; h: string } | null => { try { const v = JSON.parse(safeGet(lastKey(app)) ?? "null"); return v && typeof v.t === "string" && typeof v.h === "string" ? v : null; } catch { return null; } };
function markBackup(o: BackupOptions): void { safeSet(lastKey(o.app), JSON.stringify({ t: new Date().toISOString(), h: currentFp(o) })); }

let current: BackupOptions | null = null;
let refreshCard: () => void = () => undefined;
function mountCloudCard(o: BackupOptions): void {
  current = o; // se actualiza en cada dibujo: los adjuntos dependen de los datos actuales
  const clientId = (globalThis as any).MICROAPPS_CONFIG?.googleClientId;
  if (!cloudEnabled(clientId) || typeof document === "undefined") return;
  if (document.querySelector('[data-testid="cloud"]')) { refreshCard(); return; }
  const host = document.querySelector("#app") ?? document.querySelector("main");
  if (!host) return;
  let saving = false;
  const status = h("p", { class: "hint cloud-status", role: "status", "aria-live": "polite", "data-testid": "cloud-status" });
  const sync = h("p", { class: "cloud-sync", "data-testid": "cloud-sync" });
  const say = (t: string) => { status.textContent = t; };
  const save = h("button", { type: "button", class: "primary cloud-main", "data-testid": "cloud-save" }, "☁ Guardar en mi Google Drive") as HTMLButtonElement;
  const restore = h("button", { type: "button", class: "cloud-alt", "data-testid": "cloud-restore" }, "Restaurar desde mi Drive") as HTMLButtonElement;
  const auto = h("input", { type: "checkbox", "data-testid": "cloud-auto" }) as HTMLInputElement;
  const all = [save, restore];
  const busy = (on: boolean) => { saving = on; all.forEach((b) => { b.disabled = on; }); };
  const upload = async (t: string) => { const o2 = current!; await driveSave(t, o2.app, await createBackup(o2)); markBackup(o2); };

  function refresh(): void {
    const o2 = current!; const last = readLast(o2.app); const st = backupState(last, currentFp(o2));
    const hasData = o2.keys.some((k) => safeGet(k) !== null);
    const autoOn = safeGet(autoKey(o2.app)) === "1"; auto.checked = autoOn;
    card.dataset.state = st;
    if (!hasData && st === "none") sync.textContent = "Todavía no hay datos para respaldar.";
    else if (st === "none") sync.textContent = "⚠ Aún no has respaldado tus datos.";
    else if (st === "synced") sync.textContent = `✓ Todo respaldado (${sinceText(last!.t)}).`;
    else sync.textContent = `⚠ Tienes cambios sin respaldar (último respaldo: ${sinceText(last!.t)}).`;
    if (autoOn && st === "dirty" && !saving) {
      const t = sessionToken();
      if (t) { busy(true); upload(t).then(() => say("✓ Cambios guardados en tu Drive."), (e) => say((e as Error).message)).finally(() => { busy(false); refresh(); }); }
      else say("Respaldo automático en pausa: toca «Guardar en mi Google Drive» para reconectar.");
    }
  }
  refreshCard = refresh;

  save.onclick = async () => {
    busy(true);
    try { say("Conectando con Google…"); const t = await requestToken(clientId); await upload(t); say("✓ Respaldo guardado en tu Google Drive."); }
    catch (e) { say((e as Error).message); } finally { busy(false); refresh(); }
  };
  restore.onclick = async () => {
    busy(true);
    try {
      say("Conectando con Google…"); const t = await requestToken(clientId); const r = await driveLoad(t, current!.app);
      if (!r) { say("No hay un respaldo de esta app en tu Google Drive."); return; }
      await applyBackup(r.text, current!); markBackup(current!); say("✓ Restaurado desde tu Drive. Recargando…"); setTimeout(() => location.reload(), 400);
    } catch (e) { say((e as Error).message); } finally { busy(false); refresh(); }
  };
  auto.onchange = () => {
    safeSet(autoKey(current!.app), auto.checked ? "1" : "0");
    if (auto.checked && !sessionToken()) save.click(); else refresh();
  };
  const card = h("section", { class: "cloud-card", "data-testid": "cloud", "aria-label": "Respaldo en Google Drive" },
    h("div", { class: "cloud-text" },
      h("strong", {}, "No pierdas tus datos"),
      h("span", {}, "Tus datos viven en este dispositivo. Guárdalos en tu propio Google Drive para recuperarlos si cambias de celular o borras el navegador. Opcional; nosotros nunca vemos tus datos."),
      sync),
    h("div", { class: "cloud-actions" }, save, restore,
      h("label", { class: "cloud-auto" }, auto, h("span", {}, "Guardar mis cambios automáticamente (mientras Google siga conectado)"))),
    status);
  host.before(card);
  refresh();
  setInterval(refresh, 4000);
}
