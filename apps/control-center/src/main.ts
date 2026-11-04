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
interface Status {
  generatedAt: string;
  tests: { name: string; tests: number; pass: number; fail: number }[];
  registry: Registry;
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
  return (await res.json()) as Status;
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
      tile("Usuarios activos", "Sin datos", "Pendiente", "Requiere analítica de producto."),
      tile("Ingresos publicitarios", "Sin datos", "Pendiente", "Requiere AdSense/AdMob aprobados."),
      tile("Ingresos Premium", "Sin datos", "Pendiente", "Requiere Stripe o tiendas."),
      tile("Beneficio neto", "Sin datos", "Pendiente", "Depende de ingresos reales."),
    ),
    h("p", { class: "legend" }, "Real: se mide o se puede verificar en el repositorio. Pendiente: la integración no existe todavía, así que no se muestra ninguna cifra."),
  );
}

function apps(s: Status): HTMLElement {
  const cols = Object.keys(s.registry.apps[0]?.state ?? {});
  return h(
    "section",
    { "aria-labelledby": "t-apps" },
    h("h2", { id: "t-apps" }, "Aplicaciones"),
    h("p", { class: "lead" }, "La puntuación es una estimación de la investigación de mercado, no una medición de usuarios."),
    h(
      "div",
      { class: "table-wrap" },
      h(
        "table",
        { "data-testid": "apps-table" },
        h("thead", {}, h("tr", {}, h("th", { scope: "col" }, "Aplicación"), h("th", { scope: "col" }, "Puntuación estimada"), ...cols.map((c) => h("th", { scope: "col" }, c)))),
        h(
          "tbody",
          {},
          ...s.registry.apps.map((a) =>
            h(
              "tr",
              {},
              h("th", { scope: "row" }, a.path ? h("a", { href: a.path }, a.name) : a.name),
              h("td", {}, `${a.score}/100`, h("span", { class: "sub" }, a.class)),
              ...cols.map((c) => h("td", {}, chip(a.state[c] ?? "no implementado"))),
            ),
          ),
        ),
      ),
    ),
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
