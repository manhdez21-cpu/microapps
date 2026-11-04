/** Anuncios (AdSense) y estadísticas, inactivos hasta que exista configuración real (site-config.js). Sin consentimiento no se carga nada de terceros. Todo es gratis para la persona: la publicidad es la única fuente de ingresos. */
import { ga4Enabled, startAnalytics, type AnalyticsConfig } from "./analytics.ts";

export interface SiteConfig extends AnalyticsConfig { adsenseClient?: string; adSlot?: string; adSlotInline?: string; adDelayMs?: number; playUrl?: string; siteUrl?: string }
export type Consent = "granted" | "denied" | null;

export function adsEnabled(c: SiteConfig | undefined): boolean {
  return !!c && /^ca-pub-\d{10,20}$/.test(c.adsenseClient ?? "") && /^\d{6,20}$/.test(c.adSlot ?? "");
}
export type Plan = "none" | "ask" | "show";
export function adsPlan(c: SiteConfig | undefined, consent: Consent): Plan {
  if (!adsEnabled(c)) return "none";
  return consent === "granted" ? "show" : consent === "denied" ? "none" : "ask";
}
/** Hay algo de terceros que requiera permiso (anuncios o estadísticas). */
export const needsConsent = (c: SiteConfig | undefined): boolean => adsEnabled(c) || ga4Enabled(c);

/** Qué anuncios se colocan: uno bajo la herramienta y otro al final del texto; en la app instalada, solo uno. Nunca ventanas, pantallas completas ni anuncios pegados al borde. */
export function adPlacements(standalone: boolean): ("tool" | "end")[] {
  return standalone ? ["tool"] : ["tool", "end"];
}

const KEY = "microapps.adconsent.v1";
const read = (): Consent => { try { const v = localStorage.getItem(KEY); return v === "granted" || v === "denied" ? v : null; } catch { return null; } };
const write = (v: Consent) => { try { localStorage.setItem(KEY, v ?? ""); } catch { /* sin almacenamiento: se vuelve a preguntar */ } };
const today = (): string => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const isStandalone = (): boolean => { try { return matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true; } catch { return false; } };

function makeBox(c: SiteConfig, where: "tool" | "end"): HTMLElement {
  const box = document.createElement("aside");
  box.className = "ad-box"; box.setAttribute("aria-label", "Publicidad"); box.setAttribute("data-testid", "ad-box"); box.setAttribute("data-slot", where);
  const label = document.createElement("small"); label.textContent = "Publicidad"; label.className = "ad-label";
  const ins = document.createElement("ins");
  ins.className = "adsbygoogle"; ins.style.display = "block";
  ins.setAttribute("data-ad-client", c.adsenseClient!);
  ins.setAttribute("data-ad-slot", where === "end" && c.adSlotInline ? c.adSlotInline : c.adSlot!);
  ins.setAttribute("data-ad-format", "auto"); ins.setAttribute("data-full-width-responsive", "true");
  box.append(label, ins);
  return box;
}
/** El anuncio se pide solo cuando está a punto de verse; así no se cargan los que nadie llega a ver. */
function whenVisible(el: Element, fn: () => void): void {
  if (!("IntersectionObserver" in window)) return fn();
  const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); fn(); } }, { rootMargin: "200px" });
  io.observe(el);
}
function placeAds(c: SiteConfig): void {
  const main = document.querySelector("main") ?? document.body;
  const prose = main.querySelector(".prose");
  for (const where of adPlacements(isStandalone())) {
    const box = makeBox(c, where);
    if (where === "tool") (prose ? prose.before(box) : main.appendChild(box));
    else if (prose) prose.after(box); else continue;
    whenVisible(box, () => { try { ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({}); } catch { /* el bloqueador de anuncios puede impedirlo */ } });
  }
}
/** No se muestra nada hasta que la persona use la app o pasen unos segundos: la herramienta va primero. */
function showAds(c: SiteConfig): void {
  const s = document.createElement("script");
  s.async = true; s.crossOrigin = "anonymous";
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(c.adsenseClient!)}`;
  document.head.appendChild(s);
  let done = false;
  const go = () => { if (done) return; done = true; placeAds(c); };
  const delay = c.adDelayMs ?? 12000;
  if (delay <= 0) return go();
  setTimeout(go, delay);
  for (const ev of ["input", "change", "click"]) document.addEventListener(ev, go, { once: true, capture: true });
}
function start(c: SiteConfig): void {
  if (adsEnabled(c)) showAds(c);
  if (ga4Enabled(c)) startAnalytics(c, today());
}

function banner(c: SiteConfig): void {
  const b = document.createElement("div");
  b.className = "consent"; b.setAttribute("role", "dialog"); b.setAttribute("aria-label", "Anuncios y estadísticas"); b.setAttribute("data-testid", "consent");
  const p = document.createElement("p");
  p.textContent = "Esta app es gratis gracias a la publicidad. Si aceptas, se cargarán anuncios de Google y estadísticas de uso anónimas (Google Analytics), que pueden usar cookies. Puedes decir que no y usarla igual.";
  const yes = document.createElement("button"); yes.type = "button"; yes.className = "primary"; yes.textContent = "Aceptar";
  const no = document.createElement("button"); no.type = "button"; no.textContent = "No, gracias";
  const link = document.createElement("a"); link.href = new URL("../../privacidad.html", document.baseURI).href; link.textContent = "Privacidad";
  yes.onclick = () => { write("granted"); b.remove(); start(c); };
  no.onclick = () => { write("denied"); b.remove(); };
  b.append(p, yes, no, link);
  document.body.appendChild(b);
}
/** Enlace al pie para cambiar la decisión cuando quiera. */
function manageLink(): void {
  const foot = document.querySelector(".site-foot");
  if (!foot || foot.querySelector("[data-testid=consent-manage]")) return;
  const b = document.createElement("button");
  b.type = "button"; b.className = "linklike"; b.textContent = "Preferencias de anuncios"; b.setAttribute("data-testid", "consent-manage");
  b.onclick = () => { write(null); location.reload(); };
  foot.append(" · ", b);
}

export function initMonetization(): void {
  const c = (window as any).MICROAPPS_CONFIG as SiteConfig | undefined;
  if (!needsConsent(c)) return;
  manageLink();
  const consent = read();
  if (consent === "granted") start(c!);
  else if (consent === null) banner(c!);
}
if (typeof document !== "undefined") initMonetization();
