import { formatMoney, h, replaceChildren } from "../../../packages/ui/src/index.ts";
import { compute, type Form } from "./calc.ts";

const CURRENCIES = ["COP", "USD", "EUR", "MXN", "ARS", "PEN", "CLP", "BRL"];
const form: Form = { currency: "COP", materials: "", hours: "", rate: "", transport: "", overhead: "", commissionPct: "", goal: "margin", goalPct: "30", taxPct: "" };
const root = document.getElementById("app")!;
const out = h("div", { "aria-live": "polite", "data-testid": "output" });

function text(id: keyof Form, label: string, hint?: string): HTMLElement {
  return h(
    "div",
    { class: "field" },
    h("label", { for: id }, label),
    h("input", {
      id, type: "text", inputmode: "decimal", autocomplete: "off", value: form[id],
      "aria-describedby": hint ? `${id}-hint` : null,
      onInput: (e: Event) => { (form[id] as string) = (e.target as HTMLInputElement).value; update(); },
    }),
    hint ? h("p", { class: "hint", id: `${id}-hint` }, hint) : null,
  );
}

function update(): void {
  const o = compute(form);
  const money = (m: number) => formatMoney(m, form.currency);
  if (!o.ok) {
    replaceChildren(out, h("p", { class: "hint", "data-testid": "hint" }, o.error));
    return;
  }
  const r = o.result;
  const pct = (b: number) => `${(b / 100).toFixed(2).replace(".", ",")} %`;
  replaceChildren(
    out,
    h(
      "section",
      { class: "result", "aria-labelledby": "res-title" },
      h("h2", { id: "res-title" }, "Precio que debes cobrar"),
      h("p", { class: "big", "data-testid": "final-price" }, money(r.grossPrice)),
      r.tax > 0 ? h("p", { class: "label" }, `Incluye impuesto de ${money(r.tax)}.`) : h("p", { class: "label" }, "Sin impuesto (no escribiste ningún porcentaje)."),
      h(
        "dl",
        {},
        h("dt", {}, "Costo total"), h("dd", {}, money(r.totalCost)),
        h("dt", {}, "Precio sin impuesto"), h("dd", { "data-testid": "net-price" }, money(r.netPrice)),
        r.commission > 0 ? h("dt", {}, "Comisión") : null, r.commission > 0 ? h("dd", {}, money(r.commission)) : null,
        h("dt", {}, "Tu ganancia"), h("dd", { "data-testid": "profit" }, money(r.profit)),
        h("dt", {}, "Margen real"), h("dd", {}, pct(r.actualMarginBps)),
        h("dt", {}, "Recargo equivalente"), h("dd", {}, pct(r.actualMarkupBps)),
      ),
      h("h3", {}, "Cómo se calculó"),
      h("ul", { class: "formulas" }, ...o.formulas.map((f) => h("li", {}, f))),
    ),
  );
}

const currency = h(
  "select",
  { id: "currency", onChange: (e: Event) => { form.currency = (e.target as HTMLSelectElement).value; update(); } },
  ...CURRENCIES.map((c) => h("option", { value: c, selected: c === form.currency }, c)),
);

const goal = h(
  "fieldset",
  {},
  h("legend", {}, "¿Qué quieres fijar?"),
  h(
    "div",
    { class: "row" },
    ...(["margin", "markup"] as const).map((g) =>
      h(
        "label",
        { class: "check", style: "display:flex;gap:.5rem;align-items:center;font-weight:500" },
        h("input", { type: "radio", name: "goal", value: g, checked: form.goal === g, onChange: () => { form.goal = g; update(); } }),
        g === "margin" ? "Un margen sobre el precio" : "Un recargo sobre el costo",
      ),
    ),
  ),
);

replaceChildren(
  root,
  h(
    "form",
    { class: "panel", onSubmit: (e: Event) => e.preventDefault() },
    h("h2", {}, "Tus costos"),
    h("div", { class: "field" }, h("label", { for: "currency" }, "Moneda"), currency),
    h("div", { class: "row" }, text("materials", "Materiales"), text("transport", "Transporte")),
    h("div", { class: "row" }, text("hours", "Horas de trabajo", "Con un decimal, por ejemplo 1,5."), text("rate", "Tarifa por hora")),
    text("overhead", "Costos indirectos o fijos", "La parte de arriendo, herramientas o servicios que le toca a este trabajo."),
    h("h2", {}, "Tu ganancia"),
    goal,
    h("div", { class: "row three" }, text("goalPct", "Porcentaje (%)"), text("commissionPct", "Comisión (%)", "Opcional"), text("taxPct", "Impuesto (%)", "Opcional. Depende de tu país.")),
  ),
  out,
);
update();
