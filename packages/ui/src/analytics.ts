/** Medición con Google Analytics 4. Solo se carga si hay ID válido Y la persona aceptó. Nunca se envían datos escritos por la persona. */
export interface AnalyticsConfig { ga4Id?: string }
export const ga4Enabled = (c: AnalyticsConfig | undefined): boolean => !!c && /^G-[A-Z0-9]{6,14}$/.test(c.ga4Id ?? "");

/** Nombre de la app según la ruta (`/apps/<slug>/`) o «portada». */
export function appFromPath(path: string): string {
  const m = /\/apps\/([a-z0-9-]+)\//.exec(path);
  return m ? m[1]! : /\/guias\//.test(path) ? "guias" : "portada";
}

export interface Visits { first: string; last: string; n: number }
/** Cuenta una visita por día distinto. Devuelve el nuevo estado y si la persona ya había vuelto otro día. */
export function nextVisits(prev: Visits | null, today: string): { visits: Visits; returning: boolean } {
  if (!prev) return { visits: { first: today, last: today, n: 1 }, returning: false };
  if (prev.last === today) return { visits: prev, returning: prev.n > 1 };
  return { visits: { first: prev.first, last: today, n: prev.n + 1 }, returning: true };
}
export function parseVisits(raw: string | null): Visits | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Visits;
    return typeof v.first === "string" && typeof v.last === "string" && Number.isInteger(v.n) && v.n > 0 ? v : null;
  } catch { return null; }
}

const KEY = "microapps.visits.v1";
let loaded = false;
type Params = Record<string, string | number | boolean>;

export function track(name: string, params: Params = {}): void {
  if (!loaded) return;
  const w = window as any;
  w.dataLayer = w.dataLayer || [];
  w.gtag?.("event", name, params);
}

export function startAnalytics(c: AnalyticsConfig, today: string): void {
  if (loaded || !ga4Enabled(c)) return;
  loaded = true;
  const w = window as any;
  w.dataLayer = w.dataLayer || [];
  w.gtag = function gtag() { w.dataLayer.push(arguments); };
  const s = document.createElement("script");
  s.async = true; s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(c.ga4Id!)}`;
  document.head.appendChild(s);
  let prev: Visits | null = null;
  try { prev = parseVisits(localStorage.getItem(KEY)); } catch { /* sin almacenamiento */ }
  const { visits, returning } = nextVisits(prev, today);
  try { localStorage.setItem(KEY, JSON.stringify(visits)); } catch { /* se cuenta como primera visita */ }
  const app = appFromPath(location.pathname);
  w.gtag("js", new Date());
  w.gtag("config", c.ga4Id, { allow_google_signals: false, allow_ad_personalization_signals: false, user_properties: { app_visits: visits.n } });
  track("app_open", { app, visit_n: visits.n, returning });
  let used = false;
  const firstUse = () => { if (used) return; used = true; track("first_use", { app }); };
  document.addEventListener("input", firstUse, { once: true, capture: true });
  document.addEventListener("change", firstUse, { once: true, capture: true });
  document.addEventListener("click", (e) => {
    const t = (e.target as Element | null)?.closest?.("[data-track],[data-testid=install-link]");
    if (!t) return;
    track(t.getAttribute("data-track") ?? "install_click", { app });
  }, true);
}
