import { dayLabel, deleteFile, getFile, h, loadJson, prepareAttachment, putFile, replaceChildren, saveJson, todayLocal } from "../../../packages/ui/src/index.ts";
import { addWarranty, emptyData, parseData, removeWarranty, rows, search, setFile, toCsv, type Data, type Filter, type Row } from "./state.ts";

const KEY = "warranty.v2";
let data: Data = loadJson(KEY, parseData, emptyData());
let query = "", filter: Filter = "all", confirming = "";
let viewing: { title: string; url: string; pdf: boolean } | null = null;
let msg: { kind: "ok" | "error"; text: string } | null = null;
const form = { name: "", brand: "", model: "", store: "", purchase: "", months: "12", note: "", file: null as File | null };
const root = document.getElementById("app")!;
const FILTERS: [Filter, string][] = [["all", "Todas"], ["active", "Vigentes"], ["soon", "Por vencer"], ["ended", "Terminadas"]];
const STAMP: Record<string, string> = { ok: "VIGENTE", soon: "POR VENCER", today: "VENCE HOY", expired: "TERMINÓ" };

const commit = (d: Data) => { data = d; if (!saveJson(KEY, d)) msg = { kind: "error", text: "No se pudo guardar en este navegador. Descarga el CSV como respaldo." }; };
const download = (name: string, text: string, type: string) => { const url = URL.createObjectURL(new Blob([text], { type })); const a = h("a", { href: url, download: name }); document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
const field = (id: string, label: string, el: HTMLElement) => h("div", { class: "field" }, h("label", { for: id }, label), el);
const bind = (k: "name" | "brand" | "model" | "store" | "purchase" | "months" | "note") => (e: Event) => { form[k] = (e.target as HTMLInputElement).value; };

async function attach(id: string, file: File): Promise<void> {
  try {
    const blob = await prepareAttachment(file);
    const key = `war-${id}`;
    await putFile(key, blob);
    commit(setFile(data, id, key));
    msg = { kind: "ok", text: "Factura guardada en este dispositivo." };
  } catch (e) { msg = { kind: "error", text: (e as Error).message }; }
  render();
}
async function openFile(id: string): Promise<void> {
  const w = data.items.find((x) => x.id === id);
  try {
    const blob = w?.file ? await getFile(w.file) : undefined;
    if (!blob) throw new Error("No encontré el archivo en este dispositivo.");
    viewing = { title: w!.name, url: URL.createObjectURL(blob), pdf: blob.type === "application/pdf" };
  } catch (e) { msg = { kind: "error", text: (e as Error).message }; }
  render();
}

function addForm(): HTMLElement {
  return h("form", { class: "panel add", "data-testid": "w-form", onSubmit: async (e: Event) => {
    e.preventDefault();
    try {
      msg = null;
      if (!/^\d+$/.test(form.months.trim())) throw new RangeError("Escribe los meses de garantía con números.");
      const d = addWarranty(data, { name: form.name, brand: form.brand, model: form.model, store: form.store, purchase: form.purchase, months: Number(form.months), note: form.note });
      const id = d.items[d.items.length - 1]!.id;
      commit(d);
      if (form.file) await attach(id, form.file);
      Object.assign(form, { name: "", brand: "", model: "", store: "", purchase: "", note: "", file: null });
      if (!msg) msg = { kind: "ok", text: "Garantía guardada." };
    } catch (err) { msg = { kind: "error", text: (err as Error).message }; }
    render();
  } },
    h("h2", {}, data.items.length === 0 ? "Registra tu primera compra" : "Nueva compra"),
    field("name", "Producto", h("input", { id: "name", type: "text", maxlength: "60", autocomplete: "off", placeholder: "Nevera, celular, TV…", value: form.name, onInput: bind("name") })),
    h("div", { class: "row" }, field("brand", "Marca", h("input", { id: "brand", type: "text", maxlength: "40", autocomplete: "off", value: form.brand, onInput: bind("brand") })), field("model", "Modelo", h("input", { id: "model", type: "text", maxlength: "40", autocomplete: "off", value: form.model, onInput: bind("model") }))),
    field("store", "Tienda", h("input", { id: "store", type: "text", maxlength: "40", autocomplete: "off", value: form.store, onInput: bind("store") })),
    h("div", { class: "row" }, field("purchase", "Fecha de compra", h("input", { id: "purchase", type: "date", value: form.purchase, onInput: bind("purchase") })), field("months", "Garantía (meses)", h("input", { id: "months", type: "text", inputmode: "numeric", value: form.months, onInput: bind("months") }))),
    field("wnote", "Nota (opcional)", h("input", { id: "wnote", type: "text", maxlength: "120", autocomplete: "off", value: form.note, onInput: bind("note") })),
    field("wfile", "Foto o PDF de la factura (opcional)", h("input", { id: "wfile", type: "file", accept: "image/*,application/pdf", onChange: (e: Event) => { form.file = (e.target as HTMLInputElement).files?.[0] ?? null; } })),
    h("button", { type: "submit", class: "primary" }, "Guardar garantía"));
}

function ticket(r: Row): HTMLElement {
  const w = r.w;
  const sub = [w.brand, w.model].filter(Boolean).join(" · ");
  return h("li", { class: `ticket ${r.state}`, "data-testid": `w-${w.id}` },
    h("div", { class: "t-main" },
      h("strong", { class: "t-name" }, w.name), sub && h("span", { class: "t-sub" }, sub),
      h("dl", { class: "t-lines" },
        h("div", {}, h("dt", {}, "Compra"), h("dd", {}, w.purchase)), h("div", {}, h("dt", {}, "Garantía"), h("dd", {}, `${w.months} meses`)), h("div", {}, h("dt", {}, "Termina"), h("dd", {}, r.end)), w.store ? h("div", {}, h("dt", {}, "Tienda"), h("dd", {}, w.store)) : null),
      w.note && h("span", { class: "t-sub" }, w.note),
      h("div", { class: "t-actions" },
        w.file ? h("button", { type: "button", class: "small", onClick: () => openFile(w.id) }, "Ver factura") : h("label", { class: "button small attach" }, "Adjuntar factura", h("input", { type: "file", accept: "image/*,application/pdf", onChange: (e: Event) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) void attach(w.id, f); } })),
        confirming === w.id ? h("button", { type: "button", class: "danger small", onClick: () => { const f = w.file; commit(removeWarranty(data, w.id)); if (f) void deleteFile(f).catch(() => undefined); confirming = ""; render(); } }, "Sí, quitar") : h("button", { type: "button", class: "ghost small", "aria-label": `Quitar ${w.name}`, onClick: () => { confirming = w.id; render(); } }, "Quitar"))),
    h("div", { class: "t-stub", "aria-label": dayLabel(r.daysLeft) }, h("span", { class: "stamp" }, STAMP[r.state]!), h("span", { class: "days" }, dayLabel(r.daysLeft))));
}

function render(): void {
  const today = todayLocal();
  const all = rows(data, today);
  const shown = search(all, query, filter);
  const active = all.filter((r) => r.state !== "expired").length;
  replaceChildren(root,
    msg && h("p", { class: `note ${msg.kind}`, role: msg.kind === "error" ? "alert" : "status" }, msg.text),
    data.items.length === 0 ? addForm() : h("div", {},
      h("p", { class: "summary", "data-testid": "summary" }, `${active} ${active === 1 ? "garantía vigente" : "garantías vigentes"} de ${all.length}.`),
      h("div", { class: "finder" },
        h("label", { for: "q", class: "sr-only" }, "Buscar"), h("input", { id: "q", type: "search", placeholder: "Buscar por producto, marca, tienda…", autocomplete: "off", value: query, onInput: (e: Event) => { query = (e.target as HTMLInputElement).value; render(); const q = document.getElementById("q") as HTMLInputElement; q.focus(); q.setSelectionRange(query.length, query.length); } }),
        h("div", { class: "filters", role: "group", "aria-label": "Filtrar por estado" }, ...FILTERS.map(([f, l]) => h("button", { type: "button", class: "chipro", "aria-pressed": String(filter === f), onClick: () => { filter = f; render(); } }, l)))),
      shown.length === 0 ? h("p", { class: "hint", "data-testid": "no-results" }, "Ninguna garantía coincide con la búsqueda.") : h("ul", { class: "tickets", "data-testid": "tickets" }, ...shown.map(ticket)),
      h("details", { class: "add-wrap" }, h("summary", {}, "Nueva compra"), addForm()),
      h("div", { class: "tools" }, h("button", { type: "button", onClick: () => download("garantias.csv", "﻿" + toCsv(data, today), "text/csv") }, "Descargar CSV"))),
    viewing && h("dialog", { class: "viewer", "data-testid": "viewer", onClose: () => { if (viewing) URL.revokeObjectURL(viewing.url); viewing = null; } }, h("h2", {}, viewing.title), viewing.pdf ? h("a", { href: viewing.url, target: "_blank", rel: "noopener" }, "Abrir el PDF") : h("img", { src: viewing.url, alt: `Factura de ${viewing.title}` }), h("div", { class: "actions" }, h("button", { type: "button", class: "primary", onClick: (e: Event) => (e.target as HTMLElement).closest("dialog")!.close() }, "Cerrar"))));
  const dlg = root.querySelector("dialog.viewer") as HTMLDialogElement | null;
  if (dlg && !dlg.open) { try { dlg.showModal(); } catch { /* sin soporte */ } }
}
render();
