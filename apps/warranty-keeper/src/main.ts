import { dayLabel, h, loadJson, replaceChildren, saveJson, todayLocal } from "../../../packages/ui/src/index.ts";
import { addWarranty, emptyData, parseData, removeWarranty, rows, toCsv, type Data } from "./state.ts";

const KEY = "warrantykeeper.v1";
let data: Data = loadJson(KEY, parseData, emptyData());
let msg: { kind: "ok" | "error"; text: string } | null = null;
const form = { name: "", store: "", purchase: todayLocal(), months: "12", note: "" };
const root = document.getElementById("app")!;
const commit = (d: Data) => { data = d; if (!saveJson(KEY, data)) msg = { kind: "error", text: "No se pudo guardar en este navegador. Descarga el CSV como respaldo." }; render(); };
const inp = (id: string, label: string, key: keyof typeof form, extra: Record<string, unknown> = {}) =>
  h("div", { class: "field" }, h("label", { for: id }, label), h("input", { id, type: "text", autocomplete: "off", value: form[key], onInput: (e: Event) => { form[key] = (e.target as HTMLInputElement).value; }, ...extra }));

function submit(): void {
  try {
    msg = null;
    const months = /^\d+$/.test(form.months.trim()) ? Number(form.months) : NaN;
    const d = addWarranty(data, form.name, form.store, form.purchase, months, form.note);
    form.name = ""; form.store = ""; form.note = "";
    commit(d);
  } catch (e) { msg = { kind: "error", text: (e as Error).message }; render(); }
}

function render(): void {
  const list = rows(data, todayLocal());
  replaceChildren(root,
    msg && h("p", { class: `note ${msg.kind}`, role: msg.kind === "error" ? "alert" : "status" }, msg.text),
    h("section", { class: "panel", "aria-labelledby": "add" },
      h("h2", { id: "add" }, "Añadir garantía"),
      h("div", { class: "row" }, inp("name", "Producto", "name", { maxlength: "60" }), inp("store", "Tienda (opcional)", "store", { maxlength: "40" })),
      h("div", { class: "row" },
        h("div", { class: "field" }, h("label", { for: "buy" }, "Fecha de compra"), h("input", { id: "buy", type: "date", value: form.purchase, onInput: (e: Event) => { form.purchase = (e.target as HTMLInputElement).value; } })),
        inp("months", "Garantía en meses", "months", { inputmode: "numeric" })),
      inp("note", "Nota (dónde está la factura, serial…)", "note", { maxlength: "120" }),
      h("button", { type: "button", class: "primary", onClick: submit }, "Añadir")),
    h("section", { "aria-labelledby": "list" },
      h("h2", { id: "list" }, "Tus garantías"),
      list.length === 0 ? h("p", { class: "hint" }, "Aún no has añadido ninguna. Anota la próxima compra importante y no pierdas la garantía.") :
        h("ul", { class: "moves", "data-testid": "list" }, ...list.map((x) =>
          h("li", { class: x.state }, h("span", { class: "main" }, x.w.name,
            h("span", { class: "sub" }, `${x.state === "expired" ? "Terminó" : "Termina"} el ${x.end} · ${dayLabel(x.daysLeft).replace("vence", "termina").replace("venció", "terminó")}${x.w.store ? " · " + x.w.store : ""}`),
            x.w.note ? h("span", { class: "sub" }, x.w.note) : null),
            h("span", { class: `chip ${x.state}` }, x.state === "expired" ? "Vencida" : x.state === "ok" ? "Vigente" : "Termina pronto"),
            h("button", { type: "button", class: "ghost", "aria-label": `Quitar ${x.w.name}`, onClick: () => commit(removeWarranty(data, x.w.id)) }, "Quitar")))),
      list.length > 0 && h("div", { class: "actions" }, h("button", { type: "button", onClick: () => { const url = URL.createObjectURL(new Blob(["﻿" + toCsv(data, todayLocal())], { type: "text/csv" })); const a = h("a", { href: url, download: "garantias.csv" }); document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); } }, "Descargar CSV"))),
  );
}
render();
