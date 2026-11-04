import { backupPanel, currencyDigits, dayLabel, deleteFile, formatMoney, getFile, h, loadJson, parseAmount, prepareAttachment, putFile, replaceChildren, saveJson, todayLocal } from "../../../packages/ui/src/index.ts";
import { addDays, parseYmd } from "../../../packages/core/src/index.ts";
import { addDoc, addProfile, CATEGORIES, setCurrency, suggestedRenewal, updateDoc, upcomingCost, CATEGORY_LABEL, DEFAULT_WARN, emptyData, groups, monthGrid, parseData, removeDoc, removeProfile, renewDoc, rowsFor, setFile, toCsv, toIcs, type Category, type Data, type Row } from "./state.ts";

const KEY = "expiryhub.v2";
let data: Data = loadJson(KEY, parseData, emptyData());
let profile = ""; // "" = todos
let view: "next" | "calendar" = "next";
let monthRef = todayLocal().slice(0, 7);
let editing = "", renewing = "", confirming = "", viewing: { title: string; url: string; pdf: boolean } | null = null;
let msg: { kind: "ok" | "error"; text: string } | null = null;
const form = { category: "soat" as Category, profileId: "", title: "", expiry: "", warn: "", note: "", file: null as File | null, newProfile: "", renewDate: "", provider: "", cost: "", repeat: "" };
const CURRENCIES = ["COP", "USD", "EUR", "MXN", "ARS", "PEN", "CLP", "BRL"];
const blank = () => Object.assign(form, { title: "", expiry: "", warn: "", note: "", file: null, provider: "", cost: "", repeat: "" });
const root = document.getElementById("app")!;
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

const commit = (d: Data) => { data = d; if (!saveJson(KEY, d)) msg = { kind: "error", text: "No se pudo guardar en este navegador. Descarga el CSV como respaldo." }; };
const fail = (e: unknown) => { msg = { kind: "error", text: (e as Error).message }; render(); };
const download = (name: string, text: string, type: string) => { const url = URL.createObjectURL(new Blob([text], { type })); const a = h("a", { href: url, download: name }); document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
const field = (id: string, label: string, el: HTMLElement) => h("div", { class: "field" }, h("label", { for: id }, label), el);

function leaf(r: Row): HTMLElement {
  const [y, m, d] = r.doc.expiry.split("-");
  return h("div", { class: `leaf ${r.state}`, "aria-hidden": "true" }, h("span", { class: "mon" }, MONTHS[Number(m) - 1]!.slice(0, 3)), h("span", { class: "day" }, String(Number(d))), h("span", { class: "yr" }, y));
}

async function attach(docId: string, file: File): Promise<void> {
  try {
    const blob = await prepareAttachment(file);
    const old = data.docs.find((x) => x.id === docId)?.file;
    const key = `exp-${docId}`;
    await putFile(key, blob);
    commit(setFile(data, docId, key));
    if (old && old !== key) await deleteFile(old).catch(() => undefined);
    msg = { kind: "ok", text: "Adjunto guardado en este dispositivo." };
  } catch (e) { msg = { kind: "error", text: (e as Error).message }; }
  render();
}
async function openFile(docId: string): Promise<void> {
  const doc = data.docs.find((x) => x.id === docId);
  try {
    const blob = doc?.file ? await getFile(doc.file) : undefined;
    if (!blob) throw new Error("No encontré el archivo en este dispositivo.");
    viewing = { title: doc!.title, url: URL.createObjectURL(blob), pdf: blob.type === "application/pdf" };
  } catch (e) { msg = { kind: "error", text: (e as Error).message }; }
  render();
}

function addForm(): HTMLElement {
  if (!form.profileId || !data.profiles.some((p) => p.id === form.profileId)) form.profileId = profile || data.profiles[0]!.id;
  return h("form", { class: "panel add", "data-testid": "doc-form", onSubmit: async (e: Event) => {
    e.preventDefault();
    try {
      msg = null;
      const warn = form.warn.trim() === "" ? undefined : /^\d+$/.test(form.warn.trim()) ? Number(form.warn) : NaN;
      const digits = currencyDigits(data.currency ?? "COP");
      const cost = form.cost.trim() === "" ? 0 : parseAmount(form.cost, digits);
      if (cost === null) throw new RangeError("El costo no es un monto válido (o déjalo vacío).");
      const repeat = form.repeat.trim() === "" ? 0 : /^\d+$/.test(form.repeat.trim()) ? Number(form.repeat) : NaN;
      const input = { profileId: form.profileId, category: form.category, title: form.title, expiry: form.expiry, warnDays: warn as number | undefined, note: form.note, provider: form.provider, cost, repeat };
      const wasEditing = editing;
      const d = wasEditing ? updateDoc(data, wasEditing, input) : addDoc(data, input);
      const id = wasEditing || d.docs[d.docs.length - 1]!.id;
      commit(d);
      if (form.file) await attach(id, form.file);
      blank(); editing = "";
      if (!msg) msg = { kind: "ok", text: wasEditing ? "Cambios guardados." : "Documento añadido." };
      render();
    } catch (err) { fail(err); }
  } },
    h("h2", {}, editing ? "Editar documento" : data.docs.length === 0 ? "Añade tu primer documento" : "Añadir documento"),
    data.docs.length === 0 && h("p", { class: "lead" }, "SOAT, seguros, licencias, contratos, suscripciones… Anota cuándo vencen y te mostramos qué sigue."),
    h("div", { class: "row" },
      field("cat", "Tipo", h("select", { id: "cat", onChange: (e: Event) => { form.category = (e.target as HTMLSelectElement).value as Category; render(); } }, ...CATEGORIES.map((c) => h("option", { value: c, selected: c === form.category }, CATEGORY_LABEL[c])))),
      field("prof", "Perfil", h("select", { id: "prof", onChange: (e: Event) => { form.profileId = (e.target as HTMLSelectElement).value; } }, ...data.profiles.map((p) => h("option", { value: p.id, selected: p.id === form.profileId }, p.name))))),
    field("title", "Nombre del documento", h("input", { id: "title", type: "text", maxlength: "60", autocomplete: "off", placeholder: form.category === "soat" ? "SOAT del carro" : "", value: form.title, onInput: (e: Event) => { form.title = (e.target as HTMLInputElement).value; } })),
    h("div", { class: "row" },
      field("expiry", "Vence el", h("input", { id: "expiry", type: "date", value: form.expiry, onInput: (e: Event) => { form.expiry = (e.target as HTMLInputElement).value; } })),
      field("warn", "Avisarme (días antes)", h("input", { id: "warn", type: "text", inputmode: "numeric", placeholder: String(DEFAULT_WARN[form.category]), value: form.warn, onInput: (e: Event) => { form.warn = (e.target as HTMLInputElement).value; } }))),
    h("div", { class: "row" },
      field("provider", "Proveedor o aseguradora (opcional)", h("input", { id: "provider", type: "text", maxlength: "60", autocomplete: "off", value: form.provider, onInput: (e: Event) => { form.provider = (e.target as HTMLInputElement).value; } })),
      field("cost", `Costo de renovar (${data.currency ?? "COP"}, opcional)`, h("input", { id: "cost", type: "text", inputmode: "decimal", autocomplete: "off", value: form.cost, onInput: (e: Event) => { form.cost = (e.target as HTMLInputElement).value; } }))),
    h("div", { class: "row" },
      field("repeat", "Se renueva cada (meses, opcional)", h("input", { id: "repeat", type: "text", inputmode: "numeric", placeholder: "12", value: form.repeat, onInput: (e: Event) => { form.repeat = (e.target as HTMLInputElement).value; } })),
      field("cur", "Moneda", h("select", { id: "curr", onChange: (e: Event) => { commit(setCurrency(data, (e.target as HTMLSelectElement).value)); render(); } }, ...CURRENCIES.map((c) => h("option", { value: c, selected: c === (data.currency ?? "COP") }, c))))),
    field("note", "Nota (opcional)", h("input", { id: "note", type: "text", maxlength: "160", autocomplete: "off", value: form.note, onInput: (e: Event) => { form.note = (e.target as HTMLInputElement).value; } })),
    field("file", "Foto o PDF del documento (opcional)", h("input", { id: "file", type: "file", accept: "image/*,application/pdf", onChange: (e: Event) => { form.file = (e.target as HTMLInputElement).files?.[0] ?? null; } })),
    h("div", { class: "actions" }, h("button", { type: "submit", class: "primary" }, editing ? "Guardar cambios" : "Añadir documento"), editing ? h("button", { type: "button", class: "ghost", onClick: () => { editing = ""; blank(); render(); } }, "Cancelar") : null));
}

function startEdit(id: string): void {
  const x = data.docs.find((d) => d.id === id);
  if (!x) return;
  const digits = currencyDigits(data.currency ?? "COP");
  Object.assign(form, { category: x.category, profileId: x.profileId, title: x.title, expiry: x.expiry, warn: String(x.warnDays), note: x.note, file: null, provider: x.provider, cost: x.cost > 0 ? String(x.cost / 10 ** digits).replace(".", ",") : "", repeat: x.repeat > 0 ? String(x.repeat) : "" });
  editing = id; msg = null; render();
  document.querySelector("details.add-wrap")?.scrollIntoView({ block: "start" });
}

function item(r: Row): HTMLElement {
  const prof = data.profiles.find((p) => p.id === r.doc.profileId)?.name ?? "";
  const open = renewing === r.doc.id;
  return h("li", { class: `doc ${r.state}`, "data-testid": `doc-${r.doc.id}` },
    leaf(r),
    h("div", { class: "main" }, h("strong", {}, r.doc.title), h("span", { class: "sub" }, `${CATEGORY_LABEL[r.doc.category]} · ${prof}`), h("span", { class: `when ${r.state}` }, dayLabel(r.daysLeft)), [r.doc.provider, r.doc.cost > 0 ? formatMoney(r.doc.cost, data.currency ?? "COP") : "", r.doc.repeat > 0 ? `cada ${r.doc.repeat} meses` : ""].filter(Boolean).length > 0 && h("span", { class: "sub" }, [r.doc.provider, r.doc.cost > 0 ? formatMoney(r.doc.cost, data.currency ?? "COP") : "", r.doc.repeat > 0 ? `cada ${r.doc.repeat} meses` : ""].filter(Boolean).join(" · ")), r.doc.note && h("span", { class: "sub" }, r.doc.note),
      open && h("form", { class: "renew", onSubmit: (e: Event) => { e.preventDefault(); try { msg = null; commit(renewDoc(data, r.doc.id, form.renewDate, todayLocal())); renewing = ""; msg = { kind: "ok", text: `«${r.doc.title}» renovado hasta ${form.renewDate}.` }; render(); } catch (err) { fail(err); } } },
        h("label", { for: `rn-${r.doc.id}` }, "Nueva fecha de vencimiento"), h("input", { id: `rn-${r.doc.id}`, type: "date", value: form.renewDate, onInput: (e: Event) => { form.renewDate = (e.target as HTMLInputElement).value; } }),
        h("div", { class: "actions" }, h("button", { type: "submit", class: "primary small" }, "Guardar renovación"), h("button", { type: "button", class: "ghost small", onClick: () => { renewing = ""; render(); } }, "Cancelar"))),
      h("div", { class: "doc-actions" },
        h("button", { type: "button", class: "small", "aria-label": `Editar ${r.doc.title}`, onClick: () => { startEdit(r.doc.id); } }, "Editar"),
        h("button", { type: "button", class: "small", onClick: () => { renewing = r.doc.id; form.renewDate = suggestedRenewal(r.doc); render(); } }, "Renovar"),
        r.doc.file ? h("button", { type: "button", class: "small", onClick: () => openFile(r.doc.id) }, "Ver adjunto") : h("label", { class: "button small attach" }, "Adjuntar", h("input", { type: "file", accept: "image/*,application/pdf", onChange: (e: Event) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) void attach(r.doc.id, f); } })),
        confirming === r.doc.id ? h("button", { type: "button", class: "danger small", onClick: () => { const f = r.doc.file; commit(removeDoc(data, r.doc.id)); if (f) void deleteFile(f).catch(() => undefined); confirming = ""; render(); } }, "Sí, quitar") : h("button", { type: "button", class: "ghost small", "aria-label": `Quitar ${r.doc.title}`, onClick: () => { confirming = r.doc.id; render(); } }, "Quitar"))));
}

function nextView(rows: Row[]): HTMLElement {
  if (rows.length === 0) return h("p", { class: "hint", "data-testid": "empty" }, "Aquí aparecerán tus documentos ordenados por lo que vence primero.");
  const urgent = rows.filter((r) => r.state !== "ok").length;
  const uc = upcomingCost(data, todayLocal(), profile);
  return h("div", {}, uc.count > 0 && h("p", { class: "cost-note", "data-testid": "upcoming-cost" }, `Renovaciones de los próximos 12 meses (y las vencidas): ${formatMoney(uc.total, data.currency ?? "COP")} en ${uc.count} ${uc.count === 1 ? "documento" : "documentos"}.`), h("p", { class: "summary", "data-testid": "summary" }, urgent === 0 ? "Nada necesita atención por ahora." : `${urgent} ${urgent === 1 ? "documento necesita" : "documentos necesitan"} atención.`),
    ...groups(rows).map((g) => h("section", { class: `group ${g.key}`, "data-testid": `group-${g.key}` }, h("h3", {}, `${g.title} (${g.rows.length})`), h("ul", { class: "docs" }, ...g.rows.map(item)))));
}

function calendarView(rows: Row[]): HTMLElement {
  const [y, m] = monthRef.split("-").map(Number) as [number, number];
  const today = todayLocal();
  const weeks = monthGrid(y, m, rows.map((r) => r.doc));
  const shift = (n: number) => { const t = y * 12 + (m - 1) + n; monthRef = `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}`; render(); };
  const inMonth = rows.filter((r) => r.doc.expiry.startsWith(monthRef));
  return h("div", { class: "cal" },
    h("div", { class: "cal-head" }, h("button", { type: "button", class: "small", "aria-label": "Mes anterior", onClick: () => shift(-1) }, "‹"), h("h3", { "data-testid": "month" }, `${MONTHS[m - 1]} ${y}`), h("button", { type: "button", class: "small", "aria-label": "Mes siguiente", onClick: () => shift(1) }, "›")),
    h("table", { class: "grid", "aria-label": `Calendario de ${MONTHS[m - 1]} ${y}` }, h("thead", {}, h("tr", {}, ...["L", "M", "X", "J", "V", "S", "D"].map((d) => h("th", { scope: "col" }, d)))),
      h("tbody", {}, ...weeks.map((wk) => h("tr", {}, ...wk.map((c) => h("td", { class: c ? `${c.ymd === today ? "today " : ""}${c.docs.length ? "has" : ""}` : "blank", "aria-label": c && c.docs.length ? `${c.day}: ${c.docs.map((x) => x.title).join(", ")}` : null }, ...(c ? [h("span", {}, String(c.day)), c.docs.length ? h("i", { class: "dot" }) : null] : []))))))),
    inMonth.length === 0 ? h("p", { class: "hint" }, "No vence nada este mes.") : h("ul", { class: "docs" }, ...inMonth.map(item)));
}

function render(): void {
  const rows = rowsFor(data, todayLocal(), profile);
  const renewals = data.docs.flatMap((d) => d.renewals.map((r) => ({ ...r, title: d.title }))).sort((a, b) => (a.on < b.on ? 1 : -1)).slice(0, 8);
  replaceChildren(root,
    h("nav", { class: "profiles", "aria-label": "Perfiles" },
      h("button", { type: "button", class: "chipro", "aria-current": profile === "" ? "true" : null, onClick: () => { profile = ""; render(); } }, "Todos"),
      ...data.profiles.map((p) => h("button", { type: "button", class: "chipro", "aria-current": profile === p.id ? "true" : null, onClick: () => { profile = p.id; form.profileId = p.id; render(); } }, p.name))),
    h("form", { class: "newprof", onSubmit: (e: Event) => { e.preventDefault(); try { msg = null; const d = addProfile(data, form.newProfile); commit(d); form.newProfile = ""; profile = d.profiles[d.profiles.length - 1]!.id; form.profileId = profile; render(); } catch (err) { fail(err); } } },
      h("label", { for: "np", class: "sr-only" }, "Nuevo perfil"), h("input", { id: "np", type: "text", maxlength: "30", placeholder: "Nuevo perfil (ej. Mi carro)", autocomplete: "off", value: form.newProfile, onInput: (e: Event) => { form.newProfile = (e.target as HTMLInputElement).value; } }), h("button", { type: "submit", class: "small" }, "Crear perfil"),
      profile && data.profiles.length > 1 && h("button", { type: "button", class: "ghost small", onClick: () => { try { msg = null; commit(removeProfile(data, profile)); profile = ""; render(); } catch (err) { fail(err); } } }, "Borrar este perfil")),
    msg && h("p", { class: `note ${msg.kind}`, role: msg.kind === "error" ? "alert" : "status" }, msg.text),
    data.docs.length === 0 ? addForm() : h("div", {},
      h("div", { class: "tabs", role: "tablist" }, ...([["next", "Próximos"], ["calendar", "Calendario"]] as const).map(([v, l]) => h("button", { type: "button", role: "tab", "aria-selected": String(view === v), onClick: () => { view = v; render(); } }, l))),
      view === "next" ? nextView(rows) : calendarView(rows),
      h("details", { class: "add-wrap", open: editing ? true : null }, h("summary", {}, editing ? "Editar documento" : "Añadir documento"), addForm()),
      renewals.length > 0 && h("section", {}, h("h3", {}, "Historial de renovaciones"), h("ul", { class: "history", "data-testid": "renewals" }, ...renewals.map((r) => h("li", {}, h("strong", {}, r.title), h("span", { class: "sub" }, `${r.from} → ${r.to}, renovado el ${r.on}`))))),
      h("div", { class: "tools" }, h("button", { type: "button", onClick: () => download("vencimientos.ics", toIcs(data, todayLocal()), "text/calendar") }, "Añadir al calendario del teléfono (.ics)"), h("button", { type: "button", onClick: () => download("vencimientos.csv", "﻿" + toCsv(data, todayLocal()), "text/csv") }, "Descargar CSV"))),
    backupPanel({ app: "expiryhub", keys: [KEY], blobKeys: () => data.docs.map((d) => d.file).filter(Boolean) }),
    viewing && h("dialog", { class: "viewer", "data-testid": "viewer", onClose: () => { if (viewing) URL.revokeObjectURL(viewing.url); viewing = null; } }, h("h2", {}, viewing.title), viewing.pdf ? h("a", { href: viewing.url, target: "_blank", rel: "noopener" }, "Abrir el PDF") : h("img", { src: viewing.url, alt: `Adjunto de ${viewing.title}` }), h("div", { class: "actions" }, h("button", { type: "button", class: "primary", onClick: (e: Event) => (e.target as HTMLElement).closest("dialog")!.close() }, "Cerrar"))),
  );
  const dlg = root.querySelector("dialog.viewer") as HTMLDialogElement | null;
  if (dlg && !dlg.open) { try { dlg.showModal(); } catch { /* sin soporte */ } }
}
render();
void addDays;
