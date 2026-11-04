/** Anuncios y Premium, inactivos hasta que exista configuración real (site-config.js). Sin consentimiento no se carga nada de terceros. */
export interface SiteConfig { adsenseClient?: string; adSlot?: string; premiumUrl?: string }
export type Consent = "granted" | "denied" | null;

export function adsEnabled(c: SiteConfig | undefined): boolean {
  return !!c && /^ca-pub-\d{10,20}$/.test(c.adsenseClient ?? "") && /^\d{6,20}$/.test(c.adSlot ?? "");
}
export type Plan = "none" | "ask" | "show";
export function adsPlan(c: SiteConfig | undefined, consent: Consent): Plan {
  if (!adsEnabled(c)) return "none";
  return consent === "granted" ? "show" : consent === "denied" ? "none" : "ask";
}

const KEY = "microapps.adconsent.v1";
const read = (): Consent => { try { const v = localStorage.getItem(KEY); return v === "granted" || v === "denied" ? v : null; } catch { return null; } };
const write = (v: Consent) => { try { localStorage.setItem(KEY, v ?? ""); } catch { /* sin almacenamiento: se vuelve a preguntar */ } };

function showAds(c: SiteConfig): void {
  const s = document.createElement("script");
  s.async = true; s.crossOrigin = "anonymous";
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(c.adsenseClient!)}`;
  document.head.appendChild(s);
  const box = document.createElement("aside");
  box.className = "ad-box"; box.setAttribute("aria-label", "Publicidad"); box.setAttribute("data-testid", "ad-box");
  const ins = document.createElement("ins");
  ins.className = "adsbygoogle"; ins.style.display = "block";
  ins.setAttribute("data-ad-client", c.adsenseClient!); ins.setAttribute("data-ad-slot", c.adSlot!);
  ins.setAttribute("data-ad-format", "auto"); ins.setAttribute("data-full-width-responsive", "true");
  box.appendChild(ins);
  if (c.premiumUrl) { const a = document.createElement("a"); a.href = c.premiumUrl; a.textContent = "Quitar anuncios con Premium"; a.className = "ad-premium"; box.appendChild(a); }
  (document.querySelector("main") ?? document.body).appendChild(box);
  ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
}

function banner(c: SiteConfig): void {
  const b = document.createElement("div");
  b.className = "consent"; b.setAttribute("role", "dialog"); b.setAttribute("aria-label", "Anuncios"); b.setAttribute("data-testid", "consent");
  const p = document.createElement("p");
  p.textContent = "Esta app es gratis gracias a la publicidad. Si aceptas, se cargarán anuncios de Google, que pueden usar cookies. Puedes decir que no y seguir usándola igual.";
  const yes = document.createElement("button"); yes.type = "button"; yes.className = "primary"; yes.textContent = "Aceptar anuncios";
  const no = document.createElement("button"); no.type = "button"; no.textContent = "No, gracias";
  const link = document.createElement("a"); link.href = new URL("../../privacidad.html", document.baseURI).href; link.textContent = "Privacidad";
  yes.onclick = () => { write("granted"); b.remove(); showAds(c); };
  no.onclick = () => { write("denied"); b.remove(); };
  b.append(p, yes, no, link);
  document.body.appendChild(b);
}

export function initMonetization(): void {
  const c = (window as any).MICROAPPS_CONFIG as SiteConfig | undefined;
  const plan = adsPlan(c, read());
  if (plan === "show") showAds(c!);
  else if (plan === "ask") banner(c!);
}
if (typeof document !== "undefined") initMonetization();
