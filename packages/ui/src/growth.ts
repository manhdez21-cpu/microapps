/** Crecimiento orgánico sin costo: una sugerencia discreta de UNA app relacionada (solo en la web, no en la app instalada) y botón para compartir. */
export interface AppLink { slug: string; name: string; hint: string }
export const APPS: AppLink[] = [
  { slug: "splitflow", name: "SplitFlow · Dividir Cuentas", hint: "Divide gastos y ve quién paga a quién." },
  { slug: "caja-clara", name: "Caja Clara", hint: "Cierra la caja del día y mira si cuadra." },
  { slug: "priceright", name: "PriceRight · Precio Justo", hint: "Pon precio a tu trabajo con margen real." },
  { slug: "cuanto-me-sobra", name: "¿Cuánto me sobra?", hint: "Cerámica y pintura: cuánto comprar." },
  { slug: "expiryhub", name: "ExpiryHub · Vencimientos", hint: "SOAT, seguros y licencias a tiempo." },
  { slug: "warranty-keeper", name: "Warranty Keeper · Garantías", hint: "Garantías con factura y fecha de fin." },
  { slug: "huella-al-dia", name: "Huella al Día", hint: "Carnet de vacunas de tu mascota." },
];
export const othersThan = (slug: string): AppLink[] => APPS.filter((a) => a.slug !== slug);
export const shareText = (title: string, url: string): string => `Mira esta herramienta gratis: ${title} ${url}`;
/** Enlace para sugerencias o errores: WhatsApp si hay número configurado; si no, correo. Sin datos de la persona. */
export function feedbackUrl(cfg: { contactWhatsapp?: string; contactEmail?: string } | undefined, appName: string): string | null {
  const msg = `Hola, quiero sugerir una mejora o reportar un error en ${appName}: `;
  if (cfg?.contactWhatsapp && /^\d{8,15}$/.test(cfg.contactWhatsapp)) return `https://wa.me/${cfg.contactWhatsapp}?text=${encodeURIComponent(msg)}`;
  if (cfg?.contactEmail) return `mailto:${cfg.contactEmail}?subject=${encodeURIComponent(`Sugerencia: ${appName}`)}&body=${encodeURIComponent(msg)}`;
  return null;
}
export const whatsappUrl = (text: string): string => `https://wa.me/?text=${encodeURIComponent(text)}`;

/** Una sola sugerencia por app, con una frase contextual. */
export const RELATED: Record<string, { slug: string; ask: string }> = {
  "splitflow": { slug: "caja-clara", ask: "¿Llevas las cuentas de un negocio?" },
  "caja-clara": { slug: "priceright", ask: "¿Quieres fijar mejor tus precios?" },
  "priceright": { slug: "caja-clara", ask: "¿Vendes a diario?" },
  "cuanto-me-sobra": { slug: "priceright", ask: "¿Cotizas trabajos?" },
  "expiryhub": { slug: "warranty-keeper", ask: "¿Guardas garantías de tus compras?" },
  "warranty-keeper": { slug: "expiryhub", ask: "¿Te cuesta acordarte de los vencimientos?" },
  "huella-al-dia": { slug: "expiryhub", ask: "¿Olvidas fechas importantes?" },
};
export const relatedFor = (slug: string): { app: AppLink; ask: string } | null => {
  const r = RELATED[slug]; const app = r && APPS.find((a) => a.slug === r.slug);
  return r && app ? { app, ask: r.ask } : null;
};
const isInstalled = (): boolean => { try { return matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true; } catch { return false; } };

function init(): void {
  const m = /\/apps\/([a-z0-9-]+)\//.exec(location.pathname);
  const main = document.querySelector("main");
  if (!m || !main || main.querySelector(".more-tools")) return;
  const sec = document.createElement("section");
  sec.className = "more-tools"; sec.setAttribute("data-testid", "more-tools");
  const rel = isInstalled() ? null : relatedFor(m[1]!);
  if (rel) {
    const p = document.createElement("p"); p.className = "related";
    const link = document.createElement("a");
    link.href = `../${rel.app.slug}/index.html`; link.setAttribute("data-track", "cross_link");
    link.textContent = `Prueba ${rel.app.name}`;
    p.append(`${rel.ask} `, link);
    sec.appendChild(p);
  }
  const row = document.createElement("div"); row.className = "share-row";
  const text = shareText(document.title.split(":")[0]!.trim(), location.href.split("#")[0]!);
  const btn = document.createElement("button"); btn.type = "button"; btn.textContent = "Compartir esta herramienta"; btn.setAttribute("data-track", "share_click"); btn.setAttribute("data-testid", "share-app");
  btn.onclick = async () => {
    if (navigator.share) { try { await navigator.share({ title: document.title, text, url: location.href }); } catch { /* cancelado */ } }
    else window.open(whatsappUrl(text), "_blank", "noopener");
  };
  row.appendChild(btn);
  const fb = feedbackUrl((window as any).MICROAPPS_CONFIG, document.title.split(":")[0]!.trim());
  if (fb) {
    const a = document.createElement("a"); a.href = fb; a.target = "_blank"; a.rel = "noopener"; a.className = "button";
    a.textContent = "Sugerir una mejora o reportar un error"; a.setAttribute("data-track", "feedback_click"); a.setAttribute("data-testid", "feedback");
    row.appendChild(a);
  }
  sec.appendChild(row);
  const foot = document.querySelector(".site-foot");
  if (foot && !foot.querySelector("[data-testid=legal-links]")) {
    const sp = document.createElement("span"); sp.setAttribute("data-testid", "legal-links"); sp.append(" · ");
    const pv = document.createElement("a"); pv.href = new URL("../../privacidad.html", document.baseURI).href; pv.textContent = "Privacidad";
    const tm = document.createElement("a"); tm.href = new URL("../../terminos.html", document.baseURI).href; tm.textContent = "Términos de uso";
    sp.append(pv, " · ", tm); foot.append(sp);
  }
  (main.querySelector(".prose") ?? main).after(sec);
}
if (typeof document !== "undefined") init();
