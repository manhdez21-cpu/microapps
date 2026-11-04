import { h, replaceChildren } from "../../../packages/ui/src/index.ts";
import { computePaint, computeTiles, type PaintForm, type TileForm } from "./calc.ts";

const tile: TileForm = { roomLength: "", roomWidth: "", tileLength: "", tileWidth: "", grout: "", waste: "10", perBox: "" };
const paint: PaintForm = { roomLength: "", roomWidth: "", height: "2,5", openings: "", ceiling: false, coats: "2", coverage: "", waste: "" };
let tab: "tile" | "paint" = "tile";

const root = document.getElementById("app")!;
const out = h("div", { "aria-live": "polite", "data-testid": "output" });
const nf = new Intl.NumberFormat("es", { maximumFractionDigits: 2 });

function input<T extends object>(store: T, key: keyof T & string, label: string, hint?: string): HTMLElement {
  const id = `${tab}-${key}`;
  return h(
    "div",
    { class: "field" },
    h("label", { for: id }, label),
    h("input", {
      id, type: "text", inputmode: "decimal", autocomplete: "off", value: String(store[key]),
      "aria-describedby": hint ? `${id}-hint` : null,
      onInput: (e: Event) => { (store[key] as unknown as string) = (e.target as HTMLInputElement).value; update(); },
    }),
    hint ? h("p", { class: "hint", id: `${id}-hint` }, hint) : null,
  );
}

function result(title: string, big: string, rows: [string, string][], formulas: string[]): HTMLElement {
  return h(
    "section",
    { class: "result", "aria-labelledby": "res-title" },
    h("h2", { id: "res-title" }, title),
    h("p", { class: "big", "data-testid": "headline" }, big),
    h("dl", {}, ...rows.flatMap(([k, v]) => [h("dt", {}, k), h("dd", {}, v)])),
    h("h3", {}, "Cómo se calculó"),
    h("ul", { class: "formulas" }, ...formulas.map((f) => h("li", {}, f))),
  );
}

function update(): void {
  if (tab === "tile") {
    const r = computeTiles(tile);
    replaceChildren(
      out,
      !r.ok
        ? h("p", { class: "hint", "data-testid": "hint" }, r.error)
        : result(
            "Cuánto necesitas",
            r.boxes !== undefined ? `${r.boxes} ${r.boxes === 1 ? "caja" : "cajas"}` : `${r.tilesWithWaste} piezas`,
            [
              ["Área", `${nf.format(r.area)} m²`],
              ["Piezas netas", String(r.tilesNet)],
              ["Piezas con desperdicio", String(r.tilesWithWaste)],
              ...(r.boxes !== undefined ? ([["Piezas que sobran de las cajas", String(r.leftover ?? 0)]] as [string, string][]) : []),
            ],
            r.formulas,
          ),
    );
  } else {
    const r = computePaint(paint);
    replaceChildren(
      out,
      !r.ok
        ? h("p", { class: "hint", "data-testid": "hint" }, r.error)
        : result("Cuánto necesitas", `${nf.format(r.liters)} litros`, [["Superficie a pintar", `${nf.format(r.area)} m²`]], r.formulas),
    );
  }
}

function mount(): void {
  const tabs = h(
    "div",
    { class: "tabs", role: "tablist", "aria-label": "Qué quieres calcular" },
    ...(["tile", "paint"] as const).map((t) =>
      h("button", { type: "button", role: "tab", id: `tab-${t}`, "aria-selected": tab === t ? "true" : "false", onClick: () => { tab = t; mount(); } }, t === "tile" ? "Cerámica o piso" : "Pintura"),
    ),
  );
  const form =
    tab === "tile"
      ? h(
          "form",
          { class: "panel", onSubmit: (e: Event) => e.preventDefault() },
          h("h2", {}, "Medidas"),
          h("div", { class: "row" }, input(tile, "roomLength", "Largo de la habitación (m)"), input(tile, "roomWidth", "Ancho de la habitación (m)")),
          h("div", { class: "row" }, input(tile, "tileLength", "Largo de la pieza (cm)"), input(tile, "tileWidth", "Ancho de la pieza (cm)")),
          h("div", { class: "row three" }, input(tile, "grout", "Junta (mm)", "Opcional"), input(tile, "waste", "Desperdicio (%)", "Pregunta a tu instalador."), input(tile, "perBox", "Piezas por caja", "Opcional")),
        )
      : h(
          "form",
          { class: "panel", onSubmit: (e: Event) => e.preventDefault() },
          h("h2", {}, "Medidas"),
          h("div", { class: "row three" }, input(paint, "roomLength", "Largo (m)"), input(paint, "roomWidth", "Ancho (m)"), input(paint, "height", "Altura (m)")),
          h(
            "label",
            { style: "display:flex;gap:.5rem;align-items:center;font-weight:500;min-height:44px" },
            h("input", { type: "checkbox", checked: paint.ceiling, onChange: (e: Event) => { paint.ceiling = (e.target as HTMLInputElement).checked; update(); } }),
            "Incluir el techo",
          ),
          h("div", { class: "row three" }, input(paint, "openings", "Puertas y ventanas (m²)", "Se restan de las paredes."), input(paint, "coats", "Manos"), input(paint, "coverage", "Rendimiento (m² por litro)", "Está en la etiqueta del producto.")),
          input(paint, "waste", "Desperdicio (%)", "Opcional."),
        );
  replaceChildren(root, tabs, form, out);
  update();
}
mount();
