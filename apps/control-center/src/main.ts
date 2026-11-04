import { h, replaceChildren } from "../../../packages/ui/src/index.ts";

type State = "conectado" | "probado" | "implementado" | "pendiente de credenciales" | "pendiente de aprobación" | "no implementado";

interface AppRow { id: string; name: string; score: number; class: string; state: Record<string, State>; path?: string }
interface Registry {
  updated: string;
  phase: string;
  notes: string;
  apps: AppRow[];
  integrations: { name: string; state: State; needs: string }[];
  costs: { currentUsd: number; source: string; note: string };
  pendingMetrics: Record<string, string[]>;
  roadmap: { item: string; state: State }[];
  blockers: string[];
}
interface PerApp {
  unitTests: { tests: number; pass: number } | null;
  e2eSteps: number;
  sourceLines: number;
  buildKb: number | null;
  seo: { title: number; description: number; jsonLd: number; faq: boolean };
  pwa: { manifest: boolean; serviceWorker: boolean };
  adsReady: boolean;
}
interface Row { views: number; users: number; newUsers: number; returningUsers: number; adRevenue: number }
interface Metrics { source: string; fetchedAt: string; range: string; overall: Row; apps: Record<string, Row> }
interface Status {
  generatedAt: string;
  perApp: Record<string, PerApp>;
  tests: { name: string; tests: number; pass: number; fail: number }[];
  registry: Registry;
  metrics?: Metrics | null;
}

const TABS = [
  { id: "resumen", label: "Resumen" },
  { id: "apps", label: "Aplicaciones" },
  { id: "marketing", label: "Marketing" },
  { id: "operaciones", label: "Operaciones" },
  { id: "inteligencia", label: "Inteligencia" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const root = document.getElementById("app")!;

async function load(): Promise<Status> {
  const res = await fetch("./data/status.json", { cache: "no-cache" });
  if (!res.ok) throw new Error(`No se pudo cargar status.json (${res.status}).`);
  const st = (await res.json()) as Status;
  try { const m = await fetch("./data/metrics.json", { cache: "no-cache" }); const j = m.ok ? ((await m.json()) as Partial<Metrics>) : null; st.metrics = j && j.overall && j.apps ? (j as Metrics) : null; } catch { st.metrics = null; }
  return st;
}

const num = (n: number): string => n.toLocaleString("es");
const when = (m: Metrics): string => `${m.source}, ${m.range}, traído ${m.fetchedAt.slice(0, 16).replace("T", " ")} UTC.`;
/** Cifras de GA4 si existen; si no, «Sin datos» pendiente. Nunca se inventa nada. */
function metricTiles(m: Metrics | null | undefined, r: Row | undefined): HTMLElement[] {
  if (!m || !r) return [
    tile("Visitas", "Sin datos", "Pendiente", "Falta conectar Google Analytics (ver GUIA_MANUEL.md)."),
    tile("Usuarios activos", "Sin datos", "Pendiente", "Falta conectar Google Analytics."),
    tile("Usuarios que regresan", "Sin datos", "Pendiente", "Falta conectar Google Analytics."),
    tile("Ingresos por anuncios", "Sin datos", "Pendiente", "Requiere AdSense aprobado y vinculado a GA4."),
  ];
  return [
    tile("Visitas (páginas vistas)", num(r.views), "Real", when(m)),
    tile("Usuarios activos", num(r.users), "Real", `${num(r.newUsers)} nuevos. ${when(m)}`),
    tile("Usuarios que regresan", num(r.returningUsers), "Real", `Activos menos nuevos (aproximado). ${when(m)}`),
    tile("Ingresos por anuncios", r.adRevenue === 0 ? "0" : r.adRevenue.toFixed(2), "Real", `Moneda de la propiedad de GA4; llega solo si AdSense está vinculado. ${when(m)}`),
  ];
}

const chip = (state: State): HTMLElement => h("span", { class: `chip ${state.replace(/\s+/g, "-")}` }, state);

/** Etiqueta de origen: nada se muestra sin decir de dónde sale. */
const origin = (kind: "Real" | "Pendiente"): HTMLElement => h("span", { class: `origin ${kind.toLowerCase()}` }, kind);

function tile(label: string, value: string, kind: "Real" | "Pendiente", detail: string): HTMLElement {
  return h(
    "div",
    { class: `tile ${kind.toLowerCase()}` },
    h("p", { class: "tile-label" }, label, origin(kind)),
    h("p", { class: "tile-value" }, value),
    h("p", { class: "tile-detail" }, detail),
  );
}

function resumen(s: Status): HTMLElement {
  const r = s.registry;
  const total = s.tests.reduce((a, t) => a + t.tests, 0);
  const pass = s.tests.reduce((a, t) => a + t.pass, 0);
  const connected = r.integrations.filter((i) => i.state === "conectado").length;
  return h(
    "section",
    { "aria-labelledby": "t-resumen" },
    h("h2", { id: "t-resumen" }, "Resumen"),
    h("p", { class: "lead" }, `${r.phase}. Actualizado ${r.updated}.`),
    h(
      "div",
      { class: "tiles" },
      tile("Aplicaciones en el portafolio", String(r.apps.length), "Real", "Definidas en el prompt maestro."),
      tile("Pruebas automáticas", `${pass} de ${total}`, "Real", `Ejecutadas al generar este panel (${s.generatedAt.slice(0, 16).replace("T", " ")} UTC).`),
      tile("Gasto actual", `USD ${r.costs.currentUsd}`, "Real", `${r.costs.note} Fuente: ${r.costs.source}.`),
      tile("Integraciones conectadas", `${connected} de ${r.integrations.length}`, "Real", "Ver Operaciones para lo que falta."),
      ...metricTiles(s.metrics, s.metrics?.overall),
      tile("Beneficio neto", "Sin datos", "Pendiente", "Depende de ingresos reales."),
    ),
    h("p", { class: "legend" }, "Real: se mide o se puede verificar en el repositorio. Pendiente: la integración no existe todavía, así que no se muestra ninguna cifra."),
  );
}

const APP_PENDING = ["Instalaciones"];

function appCard(s: Status, a: AppRow): HTMLElement {
  const m = s.perApp[a.id];
  if (!m) return h("section", { class: "app-card" }, h("h3", {}, a.name), h("p", { class: "hint" }, "Sin métricas medidas todavía."));
  const ok = (v: boolean) => (v ? "Sí" : "No");
  const seoOk = m.seo.jsonLd > 0 && m.seo.description <= 160;
  return h(
    "section",
    { class: "app-card", "aria-labelledby": `a-${a.id}`, "data-testid": `app-${a.id}` },
    h("h3", { id: `a-${a.id}` }, a.path ? h("a", { href: a.path }, a.name) : a.name, h("span", { class: "sub" }, `${a.class}. Puntuación estimada ${a.score}/100.`)),
    h("div", { class: "chips" }, ...Object.entries(a.state).map(([k, v]) => h("span", { class: "chipset" }, h("span", { class: "sub" }, k), chip(v)))),
    h(
      "div",
      { class: "tiles" },
      tile("Pruebas unitarias", m.unitTests ? `${m.unitTests.pass} de ${m.unitTests.tests}` : "—", "Real", "Solo las de esta app; el núcleo compartido se cuenta aparte."),
      tile("Pasos E2E definidos", String(m.e2eSteps), "Real", "Navegador real simulado; el resultado se ve en Operaciones."),
      tile("Líneas de código", String(m.sourceLines), "Real", "TypeScript, HTML y CSS de la app."),
      tile("Peso de la app", m.buildKb === null ? "—" : `${m.buildKb} KB`, "Real", "Sin el núcleo compartido."),
      tile("SEO en la página", seoOk ? "Completo" : "Revisar", "Real", `Descripción de ${m.seo.description} caracteres (máx. 160), ${m.seo.jsonLd} bloque(s) JSON-LD, FAQ: ${ok(m.seo.faq)}.`),
      tile("Instalable y sin conexión", m.pwa.manifest && m.pwa.serviceWorker ? "Sí" : "No", "Real", "Manifest y service worker presentes."),
      ...metricTiles(s.metrics, s.metrics?.apps[a.id]),
      ...APP_PENDING.map((k) => tile(k, "Sin datos", "Pendiente", "Sin fuente conectada (las tiendas no están publicadas).")),
    ),
  );
}

function apps(s: Status): HTMLElement {
  return h(
    "section",
    { "aria-labelledby": "t-apps" },
    h("h2", { id: "t-apps" }, "Aplicaciones"),
    h("p", { class: "lead" }, "Cada aplicación con sus cifras. Las marcadas Real se miden en el repositorio; las Pendientes necesitan analítica y cuentas que todavía no existen."),
    ...s.registry.apps.map((a) => appCard(s, a)),
  );
}

function pendingPanel(title: string, id: string, items: string[], needs: string): HTMLElement {
  return h(
    "section",
    { "aria-labelledby": id },
    h("h2", { id }, title),
    h("p", { class: "lead" }, needs),
    h(
      "div",
      { class: "tiles" },
      ...items.map((m) => tile(m, "Sin datos", "Pendiente", "Integración no conectada.")),
    ),
  );
}

function operaciones(s: Status): HTMLElement {
  const r = s.registry;
  return h(
    "section",
    { "aria-labelledby": "t-ops" },
    h("h2", { id: "t-ops" }, "Operaciones"),
    h("h3", {}, "Pruebas por paquete"),
    h(
      "ul",
      { class: "rows", "data-testid": "test-rows" },
      ...s.tests.map((t) => h("li", {}, h("span", {}, t.name), h("span", { class: t.fail === 0 ? "ok" : "bad" }, `${t.pass} de ${t.tests} pasan`))),
    ),
    h("h3", {}, "Hoja de ruta"),
    h("ul", { class: "rows" }, ...r.roadmap.map((x) => h("li", {}, h("span", {}, x.item), chip(x.state)))),
    h("h3", {}, "Integraciones pendientes"),
    h("ul", { class: "rows" }, ...r.integrations.map((i) => h("li", { class: "stack" }, h("span", {}, h("strong", {}, i.name), h("span", { class: "sub" }, i.needs)), chip(i.state)))),
    h("h3", {}, "Bloqueos"),
    h("ul", { class: "plain" }, ...r.blockers.map((b) => h("li", {}, b))),
  );
}

function inteligencia(): HTMLElement {
  return h(
    "section",
    { "aria-labelledby": "t-bi" },
    h("h2", { id: "t-bi" }, "Inteligencia de negocio"),
    h("p", { class: "empty" }, "Todavía no hay datos reales de uso ni de ingresos, así que no hay recomendaciones."),
    h("p", {}, "Cuando existan, este panel responderá con datos medidos: qué aplicación crece, cuál retiene mejor, cuál genera más ingresos y cuál conviene replantear."),
    h("p", { class: "hint" }, "No se muestran datos de ejemplo para no confundirlos con resultados reales."),
  );
}

function view(s: Status, tab: TabId): HTMLElement {
  switch (tab) {
    case "resumen": return resumen(s);
    case "apps": return apps(s);
    case "marketing": return pendingPanel("Marketing", "t-mkt", s.registry.pendingMetrics["Marketing"] ?? [], "Las métricas de adquisición aparecerán al conectar analítica y Search Console.");
    case "operaciones": return operaciones(s);
    case "inteligencia": return inteligencia();
  }
}

function currentTab(): TabId {
  const id = location.hash.replace("#", "");
  return (TABS.find((t) => t.id === id)?.id ?? "resumen") as TabId;
}

function mount(s: Status): void {
  const tab = currentTab();
  replaceChildren(
    root,
    h("header", { class: "bar" }, h("h1", {}, "Microapps Control Center"), h("p", { class: "sub" }, "Panel privado de la fábrica")),
    h("nav", { "aria-label": "Secciones" }, ...TABS.map((t) => h("a", { href: `#${t.id}`, "aria-current": t.id === tab ? "page" : null }, t.label))),
    h("main", { id: "main" }, view(s, tab)),
  );
}

load()
  .then((s) => {
    mount(s);
    window.addEventListener("hashchange", () => mount(s));
  })
  .catch((e: unknown) => {
    replaceChildren(root, h("p", { class: "note error", role: "alert" }, e instanceof Error ? e.message : "No se pudo cargar el panel."));
  });
