import { backupPanel, currencyDigits, dayLabel, deleteFile, formatMoney, getFile, h, loadJson, parseAmount, prepareAttachment, putFile, replaceChildren, saveJson, todayLocal } from "../../../packages/ui/src/index.ts";
import { addWarranty, coveredValue, emptyData, setCurrency, updateWarranty, parseData, removeWarranty, rows, search, setFile, toCsv, type Data, type Filter, type Row } from "./state.ts";

const KEY = "warranty.v2";
let data: Data = loadJson(KEY, parseData, emptyData());
let query = "", filter: Filter = "all", confirming = "", editing = "";
let viewing: { title: string; url: string; pdf: boolean } | null = null;
let msg: { kind: "ok" | "error"; text: string } | null = null;
const form = { name: "", brand: "", model: "", store: "", purchase: "", months: "12", note: "", file: null as File | null, serial: "", price: "", service: "", extra: "", returnDays: "" };
const CURRENCIES = ["COP", "USD", "EUR", "MXN", "ARS", "PEN", "CLP", "BRL"];
const blank = () => Object.assign(form, { name: "", brand: "", model: "", store: "", purchase: "", months: "12", note: "", file: null, serial: "", price: "", service: "", extra: "", returnDays: "" });
const root = document.getElementById("app")!;
const FILTERS: [Filter, string][] = [["all", "Todas"], ["active", "Vigentes"], ["soon", "Por vencer"], ["ended", "Terminadas"]];
const STAMP: Record<string, string> = { ok: "VIGENTE", soon: "POR VENCER", today: "VENCE HOY", expired: "TERMINÓ" };

const commit = (d: Data) => { data = d; if (!saveJson(KEY, d)) msg = { kind: "error", text: "No se pudo guardar en este navegador. Descarga el CSV como respaldo." }; };
const download = (name: string, text: string, type: string) => { const url = URL.createObjectURL(new Blob([text], { type })); const a = h("a", { href: url, download: name }); document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
const field = (id: string, label: string, el: HTMLElement) => h("div", { class: "field" }, h("label", { for: id }, label), el);
const bind = (k: "name" | "brand" | "model" | "store" | "purchase" | "months" | "note" | "serial" | "price" | "service" | "extra" | "returnDays") => (e: Event) => { form[k] = (e.target as HTMLInputElement).value; };

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
      const digits = currencyDigits(data.currency ?? "COP");
      const price = form.price.trim() === "" ? 0 : parseAmount(form.price, digits);
      if (price === null) throw new RangeError("El precio no es un monto válido (o déjalo vacío).");
      const num = (t: string, label: string) => { if (t.trim() === "") return 0; if (!/^\d+$/.test(t.trim())) throw new RangeError(`${label}: escribe un número entero o déjalo vacío.`); return Number(t); };
      const input = { name: form.name, brand: form.brand, model: form.model, store: form.store, purchase: form.purchase, months: Number(form.months), note: form.note, serial: form.serial, service: form.service, price, extra: num(form.extra, "Garantía extendida"), returnDays: num(form.returnDays, "Plazo de devolución") };
      const wasEditing = editing;
      const d = wasEditing ? updateWarranty(data, wasEditing, input) : addWarranty(data, input);
      const id = wasEditing || d.items[d.items.length - 1]!.id;
      commit(d);
      if (form.file) await attach(id, form.file);
      blank(); editing = "";
      if (!msg) msg = { kind: "ok", text: wasEditing ? "Cambios guardados." : "Garantía guardada." };
    } catch (err) { msg = { kind: "error", text: (err as Error).message }; }
    render();
  } },
    h("h2", {}, editing ? "Editar garantía" : data.items.length === 0 ? "Registra tu primera compra" : "Nueva compra"),
    field("name", "Producto", h("input", { id: "name", type: "text", maxlength: "60", autocomplete: "off", placeholder: "Nevera, celular, TV…", value: form.name, onInput: bind("name") })),
    h("div", { class: "row" }, field("brand", "Marca", h("input", { id: "brand", type: "text", maxlength: "40", autocomplete: "off", value: form.brand, onInput: bind("brand") })), field("model", "Modelo", h("input", { id: "model", type: "text", maxlength: "40", autocomplete: "off", value: form.model, onInput: bind("model") }))),
    field("store", "Tienda", h("input", { id: "store", type: "text", maxlength: "40", autocomplete: "off", value: form.store, onInput: bind("store") })),
    h("div", { class: "row" }, field("purchase", "Fecha de compra", h("input", { id: "purchase", type: "date", value: form.purchase, onInput: bind("purchase") })), field("months", "Garantía (meses)", h("input", { id: "months", type: "text", inputmode: "numeric", value: form.months, onInput: bind("months") }))),
    h("div", { class: "row" }, field("serial", "Número de serie (opcional)", h("input", { id: "serial", type: "text", maxlength: "40", autocomplete: "off", value: form.serial, onInput: bind("serial") })), field("price", `Precio pagado (${data.currency ?? "COP"}, opcional)`, h("input", { id: "price", type: "text", inputmode: "decimal", autocomplete: "off", value: form.price, onInput: bind("price") }))),
    h("div", { class: "row" }, field("extra", "Garantía extendida (meses, opcional)", h("input", { id: "extra", type: "text", inputmode: "numeric", value: form.extra, onInput: bind("extra") })), field("returnDays", "Plazo para devolver (días, opcional)", h("input", { id: "returnDays", type: "text", inputmode: "numeric", value: form.returnDays, onInput: bind("returnDays") }))),
    field("service", "Servicio técnico: teléfono o dirección (opcional)", h("input", { id: "service", type: "text", maxlength: "80", autocomplete: "off", value: form.service, onInput: bind("service") })),
    field("cur", "Moneda", h("select", { id: "curr", onChange: (e: Event) => { commit(setCurrency(data, (e.target as HTMLSelectElement).value)); render(); } }, ...CURRENCIES.map((c) => h("option", { value: c, selected: c === (data.currency ?? "COP") }, c)))),
    field("wnote", "Nota (opcional)", h("input", { id: "wnote", type: "text", maxlength: "120", autocomplete: "off", value: form.note, onInput: bind("note") })),
    field("wfile", "Foto o PDF de la factura (opcional)", h("input", { id: "wfile", type: "file", accept: "image/*,application/pdf", onChange: (e: Event) => { form.file = (e.target as HTMLInputElement).files?.[0] ?? null; } })),
    h("div", { class: "actions" }, h("button", { type: "submit", class: "primary" }, editing ? "Guardar cambios" : "Guardar garantía"), editing ? h("button", { type: "button", class: "ghost", onClick: () => { editing = ""; blank(); render(); } }, "Cancelar") : null));
}

function startEdit(id: string): void {
  const w = data.items.find((x) => x.id === id);
  if (!w) return;
  const digits = currencyDigits(data.currency ?? "COP");
  Object.assign(form, { name: w.name, brand: w.brand, model: w.model, store: w.store, purchase: w.purchase, months: String(w.months), note: w.note, file: null, serial: w.serial, price: w.price > 0 ? String(w.price / 10 ** digits).replace(".", ",") : "", service: w.service, extra: w.extra > 0 ? String(w.extra) : "", returnDays: w.returnDays > 0 ? String(w.returnDays) : "" });
  editing = id; msg = null; render();
  document.querySelector("details.add-wrap")?.scrollIntoView({ block: "start" });
}

function ticket(r: Row): HTMLElement {
  const w = r.w;
  const sub = [w.brand, w.model].filter(Boolean).join(" · ");
  return h("li", { class: `ticket ${r.state}`, "data-testid": `w-${w.id}` },
    h("div", { class: "t-main" },
      h("strong", { class: "t-name" }, w.name), sub && h("span", { class: "t-sub" }, sub),
      h("dl", { class: "t-lines" },
        h("div", {}, h("dt", {}, "Compra"), h("dd", {}, w.purchase)), h("div", {}, h("dt", {}, "Garantía"), h("dd", {}, `${w.months} meses`)), h("div", {}, h("dt", {}, "Termina"), h("dd", {}, r.end)), w.extra > 0 ? h("div", {}, h("dt", {}, "Extendida"), h("dd", {}, `+${w.extra} meses`)) : null, w.store ? h("div", {}, h("dt", {}, "Tienda"), h("dd", {}, w.store)) : null, w.serial ? h("div", {}, h("dt", {}, "Serie"), h("dd", {}, w.serial)) : null, w.price > 0 ? h("div", {}, h("dt", {}, "Precio"), h("dd", {}, formatMoney(w.price, data.currency ?? "COP"))) : null, r.returnLeft !== null ? h("div", { class: "ret" }, h("dt", {}, "Devolución"), h("dd", {}, r.returnLeft === 0 ? "último día" : `quedan ${r.returnLeft} ${r.returnLeft === 1 ? "día" : "días"}`)) : null),
      w.service && h("span", { class: "t-sub" }, `Servicio técnico: ${w.service}`),
      w.note && h("span", { class: "t-sub" }, w.note),
      h("div", { class: "t-actions" },
        h("button", { type: "button", class: "small", "aria-label": `Editar ${w.name}`, onClick: () => startEdit(w.id) }, "Editar"),
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
      coveredValue(all).count > 0 ? h("p", { class: "summary", "data-testid": "covered" }, `Valor de lo que aún tiene garantía: ${formatMoney(coveredValue(all).total, data.currency ?? "COP")} (${coveredValue(all).count} con precio).`) : null,
      h("div", { class: "finder" },
        h("label", { for: "q", class: "sr-only" }, "Buscar"), h("input", { id: "q", type: "search", placeholder: "Buscar por producto, marca, tienda…", autocomplete: "off", value: query, onInput: (e: Event) => { query = (e.target as HTMLInputElement).value; render(); const q = document.getElementById("q") as HTMLInputElement; q.focus(); q.setSelectionRange(query.length, query.length); } }),
        h("div", { class: "filters", role: "group", "aria-label": "Filtrar por estado" }, ...FILTERS.map(([f, l]) => h("button", { type: "button", class: "chipro", "aria-pressed": String(filter === f), onClick: () => { filter = f; render(); } }, l)))),
      shown.length === 0 ? h("p", { class: "hint", "data-testid": "no-results" }, "Ninguna garantía coincide con la búsqueda.") : h("ul", { class: "tickets", "data-testid": "tickets" }, ...shown.map(ticket)),
      h("details", { class: "add-wrap", open: editing ? true : null }, h("summary", {}, editing ? "Editar garantía" : "Nueva compra"), addForm()),
      h("div", { class: "tools" }, h("button", { type: "button", onClick: () => download("garantias.csv", "﻿" + toCsv(data, today), "text/csv") }, "Descargar CSV"))),
    backupPanel({ app: "warranty-keeper", keys: [KEY], blobKeys: () => data.items.map((i) => i.file).filter(Boolean) }),
    viewing && h("dialog", { class: "viewer", "data-testid": "viewer", onClose: () => { if (viewing) URL.revokeObjectURL(viewing.url); viewing = null; } }, h("h2", {}, viewing.title), viewing.pdf ? h("a", { href: viewing.url, target: "_blank", rel: "noopener" }, "Abrir el PDF") : h("img", { src: viewing.url, alt: `Factura de ${viewing.title}` }), h("div", { class: "actions" }, h("button", { type: "button", class: "primary", onClick: (e: Event) => (e.target as HTMLElement).closest("dialog")!.close() }, "Cerrar"))));
  const dlg = root.querySelector("dialog.viewer") as HTMLDialogElement | null;
  if (dlg && !dlg.open) { try { dlg.showModal(); } catch { /* sin soporte */ } }
}
render();
