import { dayLabel, h, loadJson, replaceChildren, saveJson, todayLocal } from "../../../packages/ui/src/index.ts";
import { addItem, emptyData, group, parseData, removeItem, setWarnDays, toCsv, type Data } from "./state.ts";

const KEY = "expiryhub.v1";
let data: Data = loadJson(KEY, parseData, emptyData());
let msg: { kind: "ok" | "error"; text: string } | null = null;
const form = { name: "", expiry: "", place: "" };
const root = document.getElementById("app")!;
const commit = (d: Data) => { data = d; if (!saveJson(KEY, data)) msg = { kind: "error", text: "No se pudo guardar en este navegador. Descarga el CSV como respaldo." }; render(); };

function submit(): void {
  try { msg = null; const d = addItem(data, form.name, form.expiry, form.place); form.name = ""; form.place = ""; commit(d); (document.getElementById("name") as HTMLInputElement | null)?.focus(); }
  catch (e) { msg = { kind: "error", text: (e as Error).message }; render(); }
}

function render(): void {
  const today = todayLocal();
  const groups = group(data, today);
  const urgent = groups.filter((g) => g.state !== "later").reduce((n, g) => n + g.items.length, 0);
  replaceChildren(root,
    msg && h("p", { class: `note ${msg.kind}`, role: msg.kind === "error" ? "alert" : "status" }, msg.text),
    h("section", { class: "panel", "aria-labelledby": "add" },
      h("h2", { id: "add" }, "Añadir producto"),
      h("div", { class: "row" },
        h("div", { class: "field" }, h("label", { for: "name" }, "Producto"), h("input", { id: "name", type: "text", maxlength: "60", autocomplete: "off", value: form.name, onInput: (e: Event) => { form.name = (e.target as HTMLInputElement).value; }, onKeydown: (e: KeyboardEvent) => { if (e.key === "Enter") { e.preventDefault(); submit(); } } })),
        h("div", { class: "field" }, h("label", { for: "exp" }, "Vence el"), h("input", { id: "exp", type: "date", value: form.expiry, onInput: (e: Event) => { form.expiry = (e.target as HTMLInputElement).value; } })),
      ),
      h("div", { class: "field" }, h("label", { for: "place" }, "Dónde está (opcional)"), h("input", { id: "place", type: "text", maxlength: "40", autocomplete: "off", value: form.place, onInput: (e: Event) => { form.place = (e.target as HTMLInputElement).value; } })),
      h("button", { type: "button", class: "primary", onClick: submit }, "Añadir")),
    h("section", { "aria-labelledby": "list" },
      h("h2", { id: "list" }, "Tu lista"),
      data.items.length === 0 ? h("p", { class: "hint" }, "Aún no hay productos. Añade el primero y verás aquí qué se vence antes.") :
        h("p", { class: "label", "data-testid": "summary" }, urgent === 0 ? "Nada vence pronto." : `${urgent} ${urgent === 1 ? "producto necesita" : "productos necesitan"} atención.`),
      ...groups.map((g) => h("div", { class: `group ${g.state}`, "data-testid": `group-${g.state}` },
        h("h3", {}, `${g.title} (${g.items.length})`),
        h("ul", { class: "moves" }, ...g.items.map(({ item, daysLeft }) => h("li", {},
          h("span", { class: "main" }, item.name, h("span", { class: "sub" }, `${item.expiry} · ${dayLabel(daysLeft)}${item.place ? " · " + item.place : ""}`)),
          h("button", { type: "button", class: "ghost", "aria-label": `Quitar ${item.name}`, onClick: () => commit(removeItem(data, item.id)) }, "Quitar")))))),
    ),
    h("section", { class: "panel", "aria-labelledby": "cfg" },
      h("h2", { id: "cfg" }, "Ajustes"),
      h("div", { class: "field" }, h("label", { for: "warn" }, "Avisarme con (días de antelación)"),
        h("input", { id: "warn", type: "number", min: "1", max: "365", value: String(data.warnDays), onChange: (e: Event) => { try { msg = null; commit(setWarnDays(data, Number((e.target as HTMLInputElement).value))); } catch (err) { msg = { kind: "error", text: (err as Error).message }; render(); } } })),
      h("p", { class: "hint" }, "La lista se ordena al abrir la página. Esta versión no envía notificaciones: ábrela de vez en cuando."),
      data.items.length > 0 && h("button", { type: "button", onClick: () => { const url = URL.createObjectURL(new Blob(["﻿" + toCsv(data, todayLocal())], { type: "text/csv" })); const a = h("a", { href: url, download: "vencimientos.csv" }); document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); } }, "Descargar CSV")),
  );
}
render();
