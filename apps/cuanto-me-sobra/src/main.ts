import { formatMoney, h, replaceChildren } from "../../../packages/ui/src/index.ts";
import { computePaint, computeTiles, type Item, type PaintForm, type TileForm } from "./calc.ts";

const tile: TileForm = { roomLength: "", roomWidth: "", tileLength: "", tileWidth: "", grout: "", waste: "10", perBox: "", currency: "COP", extraArea: "", price: "", adhesiveYield: "", adhesiveBag: "", adhesivePrice: "", groutYield: "", groutBag: "", groutPrice: "" };
const paint: PaintForm = { roomLength: "", roomWidth: "", height: "2,5", openings: "", ceiling: false, coats: "2", coverage: "", waste: "", currency: "COP", extraArea: "", canSize: "", canPrice: "" };
const CURRENCIES = ["COP", "USD", "EUR", "MXN", "ARS", "PEN", "CLP", "BRL"];
let shareText = "";
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

function result(title: string, big: string, rows: [string, string][], formulas: string[], items: Item[] = [], total?: number): HTMLElement {
  const cur = (tab === "tile" ? tile.currency : paint.currency) ?? "COP";
  const money = (m: number) => formatMoney(m, cur);
  const text = [title + ": " + big, ...rows.map(([k, v]) => `${k}: ${v}`), ...items.map((i) => `${i.name}: ${i.qty}${i.cost !== undefined ? ` (${money(i.cost)})` : ""}`), ...(total !== undefined ? [`Costo estimado: ${money(total)}`] : []), "", "Hecho con ¿Cuánto me sobra?"].join("\n");
  return h(
    "section",
    { class: "result", "aria-labelledby": "res-title" },
    h("h2", { id: "res-title" }, title),
    h("p", { class: "big", "data-testid": "headline" }, big),
    h("dl", {}, ...rows.flatMap(([k, v]) => [h("dt", {}, k), h("dd", {}, v)])),
    items.length > 1 || total !== undefined ? h("table", { class: "items", "data-testid": "items" }, h("thead", {}, h("tr", {}, ...["Material", "Cantidad", "Costo"].map((x) => h("th", { scope: "col" }, x)))),
      h("tbody", {}, ...items.map((i) => h("tr", {}, h("td", {}, i.name), h("td", {}, i.qty), h("td", {}, i.cost !== undefined ? money(i.cost) : "—"))),
      total !== undefined ? h("tr", { class: "total" }, h("td", { colspan: "2" }, "Costo estimado"), h("td", { "data-testid": "total-cost" }, money(total))) : null)) : null,
    h("div", { class: "actions" },
      h("button", { type: "button", onClick: async (e: Event) => { const b = e.target as HTMLButtonElement; try { await navigator.clipboard.writeText(text); b.textContent = "Copiado"; } catch { shareText = text; b.textContent = "No se pudo copiar"; } } }, "Copiar resultado"),
      h("a", { class: "button", href: `https://wa.me/?text=${encodeURIComponent(text)}`, target: "_blank", rel: "noopener" }, "Enviar por WhatsApp")),
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
            r.items,
            r.totalCost,
          ),
    );
  } else {
    const r = computePaint(paint);
    replaceChildren(
      out,
      !r.ok
        ? h("p", { class: "hint", "data-testid": "hint" }, r.error)
        : result("Cuánto necesitas", `${nf.format(r.liters)} litros`, [["Superficie a pintar", `${nf.format(r.area)} m²`]], r.formulas, r.items, r.totalCost),
    );
  }
}

function currencyField(store: { currency?: string }): HTMLElement {
  return h("div", { class: "field" }, h("label", { for: `${tab}-currency` }, "Moneda"), h("select", { id: `${tab}-currency`, onChange: (e: Event) => { store.currency = (e.target as HTMLSelectElement).value; update(); } }, ...CURRENCIES.map((c) => h("option", { value: c, selected: c === (store.currency ?? "COP") }, c))));
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
          input(tile, "extraArea", "Superficie adicional (m²)", "Opcional. Para un tramo extra o una habitación en L: mídelo aparte y súmalo aquí."),
          h("details", { class: "more" }, h("summary", {}, "Costos, adhesivo y boquilla (opcional)"),
            currencyField(tile),
            input(tile, "price", "Precio por caja (o por pieza)", "Por caja si indicaste piezas por caja; si no, por pieza."),
            h("div", { class: "row three" }, input(tile, "adhesiveYield", "Adhesivo (kg por m²)", "Está en la bolsa."), input(tile, "adhesiveBag", "Kg por bolsa de adhesivo"), input(tile, "adhesivePrice", "Precio por bolsa de adhesivo")),
            h("div", { class: "row three" }, input(tile, "groutYield", "Boquilla (kg por m²)", "Está en la bolsa."), input(tile, "groutBag", "Kg por bolsa de boquilla"), input(tile, "groutPrice", "Precio por bolsa de boquilla"))),
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
          input(paint, "extraArea", "Superficie adicional a pintar (m²)", "Opcional. Para otra pared, un pasillo o una habitación en L."),
          h("details", { class: "more" }, h("summary", {}, "Latas y costo (opcional)"), currencyField(paint), h("div", { class: "row" }, input(paint, "canSize", "Litros por lata"), input(paint, "canPrice", "Precio por lata"))),
        );
  replaceChildren(root, tabs, form, out);
  update();
}
mount();
