import { h, parseDecimal, replaceChildren } from "../../../packages/ui/src/index.ts";
import { compute, FACTORS } from "./calc.ts";

const q: Record<string, string> = {}, f: Record<string, string> = {};
const root = document.getElementById("app")!;
const out = h("div", { "aria-live": "polite", "data-testid": "output" });
const nf = (n: number, d = 1) => n.toLocaleString("es-CO", { minimumFractionDigits: d, maximumFractionDigits: d });

function update(): void {
  const o = compute(q, f, parseDecimal);
  if (!o.ok) return replaceChildren(out, h("p", { class: "hint", "data-testid": "hint" }, o.error));
  replaceChildren(out, h("section", { class: "result", "aria-labelledby": "rt" },
    h("h2", { id: "rt" }, "Tu huella estimada"),
    h("p", { class: "big", "data-testid": "year" }, `${nf(o.tonsYear, 2)} t CO₂ al año`),
    h("p", { class: "label" }, `${nf(o.kgMonth)} kg CO₂ al mes por lo que registraste.`),
    h("dl", {}, ...o.lines.flatMap((l) => [h("dt", {}, `${l.label} (${nf(l.quantity, 0 )} × ${nf(l.factor, 3)})`), h("dd", {}, `${nf(l.kgMonth)} kg/mes`)])),
    h("p", { class: "hint" }, "Solo incluye energía del hogar y combustibles del vehículo. No cuenta alimentación, vuelos ni compras. Es una estimación para comparar tu consumo con el tiempo.")));
}

const rows = FACTORS.map((x) => h("div", { class: "row" },
  h("div", { class: "field" }, h("label", { for: `q-${x.id}` }, `${x.label} al mes (${x.unit})`),
    h("input", { id: `q-${x.id}`, type: "text", inputmode: "decimal", autocomplete: "off", onInput: (e: Event) => { q[x.id] = (e.target as HTMLInputElement).value; update(); } })),
  h("div", { class: "field" }, h("label", { for: `f-${x.id}` }, `Factor (kg CO₂ por ${x.unit})`),
    h("input", { id: `f-${x.id}`, type: "text", inputmode: "decimal", autocomplete: "off", placeholder: x.kgPerUnit === null ? "obligatorio" : nf(x.kgPerUnit, 3), "aria-describedby": `fs-${x.id}`, onInput: (e: Event) => { f[x.id] = (e.target as HTMLInputElement).value; update(); } }),
    h("p", { class: "hint", id: `fs-${x.id}` }, x.source))));

replaceChildren(root, h("form", { class: "panel", onSubmit: (e: Event) => e.preventDefault() }, h("h2", {}, "Tu consumo mensual"), ...rows), out);
update();
