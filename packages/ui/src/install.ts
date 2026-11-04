/** Enlace «Instalar en tu celular» al pie de cada app: Android usa el aviso nativo; iPhone/iPad muestra los pasos manuales. */
interface InstallEvent extends Event { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> }
let deferred: InstallEvent | null = null;

export type Platform = "ios" | "android" | "other";
export function detectPlatform(ua: string, maxTouchPoints = 0): Platform {
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && maxTouchPoints > 1)) return "ios";
  return /Android/i.test(ua) ? "android" : "other";
}
export const isStandalone = (): boolean => window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;

function iosDialog(): void {
  if (document.getElementById("ios-install")) return;
  const d = document.createElement("dialog");
  d.id = "ios-install"; d.className = "install-dialog"; d.setAttribute("data-testid", "ios-install");
  d.innerHTML = '<h2>Instalar en iPhone o iPad</h2><ol><li>Abre esta página en <strong>Safari</strong>.</li><li>Toca el botón <strong>Compartir</strong> (el cuadrado con la flecha hacia arriba).</li><li>Elige <strong>Añadir a pantalla de inicio</strong>.</li><li>Toca <strong>Añadir</strong>. Se abrirá como una app, también sin conexión.</li></ol>';
  const b = document.createElement("button"); b.type = "button"; b.className = "primary"; b.textContent = "Entendido";
  b.onclick = () => d.close();
  d.appendChild(b); document.body.appendChild(d);
  d.showModal();
}

export function initInstall(): void {
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e as InstallEvent; render(); });
  window.addEventListener("appinstalled", () => { deferred = null; document.getElementById("install-link")?.remove(); });
  render();
  // Apps que dibujan su pie con JavaScript: reintenta hasta que exista (máx. 5 s).
  const obs = new MutationObserver(() => { render(); if (document.getElementById("install-link")) obs.disconnect(); });
  obs.observe(document.body, { childList: true, subtree: true });
  setTimeout(() => obs.disconnect(), 5000);
}
function render(): void {
  const host = document.querySelector(".site-foot, .foot");
  if (!host || isStandalone()) return;
  const platform = detectPlatform(navigator.userAgent, navigator.maxTouchPoints);
  if (platform === "other" && !deferred) return; // escritorio sin soporte: no estorba
  let btn = document.getElementById("install-link") as HTMLButtonElement | null;
  if (!btn) {
    btn = document.createElement("button");
    btn.id = "install-link"; btn.type = "button"; btn.className = "ghost install-link"; btn.setAttribute("data-testid", "install-link");
    host.append(" ", btn);
  }
  btn.textContent = "Instalar en tu celular";
  btn.onclick = async () => {
    if (deferred) { const e = deferred; deferred = null; await e.prompt(); await e.userChoice.catch(() => undefined); btn?.remove(); }
    else if (platform === "ios") iosDialog();
    else location.href = new URL("../../instalar.html", document.baseURI).href;
  };
}
if (typeof document !== "undefined") initInstall();
