import { backupPanel, currencyDigits, dayLabel, formatMoney, h, loadJson, parseAmount, parseDecimal, replaceChildren, saveJson, todayLocal } from "../../../packages/ui/src/index.ts";
import { spendByMonth, spendByType, updatePet, updateRecord, addPet, addRecord, ageLabel, emptyData, fichaText, history, kg, MAX_PETS, parseData, REC_LABEL, REC_TYPES, reminders, removePet, removeRecord, toCsv, totalSpent, weightSeries, type Data, type Pet, type RecType } from "./state.ts";
import { icon } from "./icons.ts";

const KEY = "huella.v1";
let data: Data = loadJson(KEY, parseData, emptyData());
let currentId = data.pets[0]?.id ?? "";
let adding = data.pets.length === 0;
let recType: RecType = "vacuna";
let filter: RecType | "" = "";
let msg: { kind: "ok" | "error"; text: string } | null = null;
let confirmDelete = false;
let ficha = false;
let editingPet = "", editingRec = "";
const petForm = { name: "", species: "perro", breed: "", birth: "", sex: "", photo: "", notes: "" };
let recForm = { date: todayLocal(), title: "", detail: "", weight: "", amount: "", next: "", repeat: "" };
const blankRec = () => ({ date: todayLocal(), title: "", detail: "", weight: "", amount: "", next: "", repeat: "" });
const root = document.getElementById("app")!;

const commit = (d: Data) => { data = d; if (!saveJson(KEY, d)) msg = { kind: "error", text: "No se pudo guardar en este navegador. Descarga el CSV como respaldo." }; };
const fail = (e: unknown) => { msg = { kind: "error", text: (e as Error).message }; render(); };
const input = (id: string, label: string, get: () => string, set: (v: string) => void, extra: Record<string, unknown> = {}) =>
  h("div", { class: "field" }, h("label", { for: id }, label), h("input", { id, type: "text", autocomplete: "off", value: get(), onInput: (e: Event) => set((e.target as HTMLInputElement).value), ...extra }));

function resizePhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = () => {
      const s = 320, side = Math.min(img.width, img.height), c = document.createElement("canvas"); c.width = c.height = s;
      c.getContext("2d")!.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, s, s);
      URL.revokeObjectURL(url); resolve(c.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("No se pudo leer esa imagen.")); };
    img.src = url;
  });
}

const avatar = (p: Pet, big = false) => h("div", { class: `avatar${big ? " big" : ""}`, role: "img", "aria-label": `Foto de ${p.name}` }, p.photo ? h("img", { src: p.photo, alt: "" }) : icon("paw", big ? 56 : 28));

function newPetForm(): HTMLElement {
  return h("form", { class: "panel hello", "data-testid": "pet-form", onSubmit: (e: Event) => {
    e.preventDefault();
    try { msg = null; const wasEditing = editingPet; const d = wasEditing ? updatePet(data, wasEditing, petForm as never, todayLocal()) : addPet(data, petForm as never, todayLocal()); commit(d); currentId = wasEditing || d.pets[d.pets.length - 1]!.id; adding = false; editingPet = ""; Object.assign(petForm, { name: "", breed: "", birth: "", sex: "", photo: "", notes: "" }); render(); } catch (err) { fail(err); }
  } },
    h("h2", {}, editingPet ? "Editar mascota" : data.pets.length === 0 ? "Registra a tu primera mascota" : "Nueva mascota"),
    data.pets.length === 0 && h("p", { class: "lead" }, "Vacunas, peso, baños y gastos en un solo lugar, y lo próximo que le toca. Tus datos se quedan en este dispositivo."),
    h("fieldset", {}, h("legend", {}, "¿Es perro o gato?"),
      h("div", { class: "species" }, ...(["perro", "gato"] as const).map((s) => h("label", { class: "pick" }, h("input", { type: "radio", name: "species", value: s, checked: petForm.species === s, onChange: () => { petForm.species = s; } }), h("span", {}, s === "perro" ? "Perro" : "Gato"))))),
    input("pname", "Nombre", () => petForm.name, (v) => { petForm.name = v; }, { maxlength: "40" }),
    h("div", { class: "row" }, input("pbreed", "Raza (opcional)", () => petForm.breed, (v) => { petForm.breed = v; }, { maxlength: "40" }),
      h("div", { class: "field" }, h("label", { for: "pbirth" }, "Fecha de nacimiento (aprox.)"), h("input", { id: "pbirth", type: "date", max: todayLocal(), value: petForm.birth, onInput: (e: Event) => { petForm.birth = (e.target as HTMLInputElement).value; } }))),
    h("div", { class: "row" },
      h("div", { class: "field" }, h("label", { for: "psex" }, "Sexo (opcional)"), h("select", { id: "psex", onChange: (e: Event) => { petForm.sex = (e.target as HTMLSelectElement).value; } }, ...[["", "Sin indicar"], ["macho", "Macho"], ["hembra", "Hembra"]].map(([v, l]) => h("option", { value: v, selected: petForm.sex === v }, l)))),
      h("div", { class: "field" }, h("label", { for: "pphoto" }, "Foto (opcional)"), h("input", { id: "pphoto", type: "file", accept: "image/*", onChange: async (e: Event) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) { try { petForm.photo = await resizePhoto(f); msg = { kind: "ok", text: "Foto lista." }; } catch (err) { msg = { kind: "error", text: (err as Error).message }; } render(); } } }))),
    h("div", { class: "actions" }, h("button", { type: "submit", class: "primary" }, editingPet ? "Guardar cambios" : "Guardar mascota"), data.pets.length > 0 && h("button", { type: "button", class: "ghost", onClick: () => { adding = false; editingPet = ""; Object.assign(petForm, { name: "", breed: "", birth: "", sex: "", photo: "", notes: "" }); msg = null; render(); } }, "Cancelar")),
  );
}

function chart(pet: Pet): HTMLElement | null {
  const s = weightSeries(data, pet.id);
  if (s.length < 2) return null;
  const W = 320, H = 110, pad = 14, min = Math.min(...s.map((x) => x.grams)), max = Math.max(...s.map((x) => x.grams)), span = Math.max(max - min, 1);
  const x = (i: number) => pad + (i * (W - 2 * pad)) / (s.length - 1), y = (g: number) => H - pad - ((g - min) / span) * (H - 2 * pad);
  const pts = s.map((p, i) => `${x(i).toFixed(1)},${y(p.grams).toFixed(1)}`).join(" ");
  const el = h("figure", { class: "weight", "data-testid": "weight-chart" }, h("figcaption", {}, `Peso: ${kg(s[0]!.grams)} kg → ${kg(s.at(-1)!.grams)} kg`));
  const wrap = document.createElement("div");
  wrap.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolución del peso de ${pet.name.replace(/[<>&"]/g, "")}"><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>${s.map((p, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(p.grams).toFixed(1)}" r="${i === s.length - 1 ? 5 : 3}" fill="${i === s.length - 1 ? "currentColor" : "var(--card)"}" stroke="currentColor" stroke-width="2"/>`).join("")}</svg>`;
  el.appendChild(wrap.firstElementChild!);
  return el;
}

function startEditRec(id: string): void {
  const r = data.records.find((x) => x.id === id);
  if (!r) return;
  const digits = currencyDigits(data.currency);
  recType = r.type; editingRec = id;
  recForm = { date: r.date, title: r.title, detail: r.detail, weight: r.weightG ? String(r.weightG / 1000).replace(".", ",") : "", amount: r.amount ? String(r.amount / 10 ** digits).replace(".", ",") : "", next: r.next ?? "", repeat: r.repeat ? String(r.repeat) : "" };
  msg = null; render();
  document.getElementById("add")?.scrollIntoView({ block: "start" });
}

function spendSection(pet: Pet): HTMLElement | null {
  const months = spendByMonth(data, pet.id), types = spendByType(data, pet.id);
  if (months.length === 0) return null;
  const f = (m: number) => formatMoney(m, data.currency);
  return h("section", { "aria-labelledby": "spend", "data-testid": "spend" }, h("h3", { id: "spend" }, "Gastos"),
    h("ul", { class: "spend" }, ...months.slice(0, 6).map((m) => h("li", {}, h("span", {}, m.month), h("strong", {}, f(m.total))))),
    h("ul", { class: "spend by-type" }, ...types.map((t) => h("li", {}, h("span", {}, REC_LABEL[t.type]), h("strong", {}, f(t.total))))));
}

function recordForm(pet: Pet): HTMLElement {
  const t = recType, needsTitle = ["vacuna", "desparasitacion", "consulta", "medicamento"].includes(t), hasNext = ["vacuna", "desparasitacion", "consulta", "medicamento"].includes(t);
  const titleLabel = { vacuna: "¿Qué vacuna? (ej. Rabia)", desparasitacion: "Producto o tipo (ej. Interna)", consulta: "Motivo (ej. Control anual)", medicamento: "Medicamento y dosis que indicó el veterinario", gasto: "¿En qué? (ej. Alimento)", bano: "Nota (opcional)", peso: "Nota (opcional)" }[t];
  return h("form", { class: "panel record", "data-testid": "record-form", onSubmit: (e: Event) => {
    e.preventDefault();
    try {
      msg = null;
      const digits = currencyDigits(data.currency);
      const weightG = t === "peso" ? (() => { const v = parseDecimal(recForm.weight); return v === null ? undefined : Math.round(v * 1000); })() : undefined;
      const amount = recForm.amount.trim() ? parseAmount(recForm.amount, digits) : undefined;
      if (recForm.amount.trim() && (amount === null || amount === undefined)) throw new RangeError("El valor no es válido.");
      const repeat = recForm.repeat.trim() === "" ? 0 : /^\d+$/.test(recForm.repeat.trim()) ? Number(recForm.repeat) : NaN;
      const input = { petId: pet.id, type: t, date: recForm.date, title: recForm.title, detail: recForm.detail, weightG, amount: amount ?? undefined, next: recForm.next || undefined, repeat };
      const wasEditing = editingRec;
      commit(wasEditing ? updateRecord(data, wasEditing, input, todayLocal()) : addRecord(data, input, todayLocal()));
      recForm = blankRec(); editingRec = "";
      msg = { kind: "ok", text: wasEditing ? "Cambios guardados." : `${REC_LABEL[t]} guardado en el historial de ${pet.name}.` }; render();
    } catch (err) { fail(err); }
  } },
    h("h3", {}, `${editingRec ? "Editar" : "Anotar"}: ${REC_LABEL[t]}`),
    h("div", { class: "row" },
      h("div", { class: "field" }, h("label", { for: "rdate" }, "Fecha"), h("input", { id: "rdate", type: "date", max: todayLocal(), value: recForm.date, onInput: (e: Event) => { recForm.date = (e.target as HTMLInputElement).value; } })),
      t === "peso" ? input("rweight", "Peso (kg)", () => recForm.weight, (v) => { recForm.weight = v; }, { inputmode: "decimal" }) : input("rtitle", titleLabel, () => recForm.title, (v) => { recForm.title = v; }, { maxlength: "60", required: needsTitle ? true : null })),
    t !== "peso" && t !== "gasto" && input("rdetail", "Detalle (opcional)", () => recForm.detail, (v) => { recForm.detail = v; }, { maxlength: "160" }),
    h("div", { class: "row" },
      input("ramount", t === "gasto" ? `Valor (${data.currency})` : `Costo en ${data.currency} (opcional)`, () => recForm.amount, (v) => { recForm.amount = v; }, { inputmode: "decimal" }),
      hasNext && input("rrepeat", "Se repite cada (meses)", () => recForm.repeat, (v) => { recForm.repeat = v; }, { inputmode: "numeric", placeholder: "Ej. 12" }),
      hasNext && h("div", { class: "field" }, h("label", { for: "rnext" }, "Próxima fecha (opcional)"), h("input", { id: "rnext", type: "date", value: recForm.next, onInput: (e: Event) => { recForm.next = (e.target as HTMLInputElement).value; } }))),
    t === "medicamento" && h("p", { class: "hint" }, "Anota solo lo que recetó el veterinario. Esta app no recomienda ni calcula dosis."),
    h("div", { class: "actions" }, h("button", { type: "submit", class: "primary" }, editingRec ? "Guardar cambios" : "Guardar en el historial"), editingRec ? h("button", { type: "button", class: "ghost", onClick: () => { editingRec = ""; recForm = blankRec(); render(); } }, "Cancelar edición") : null),
  );
}

function fichaDialog(pet: Pet): HTMLElement {
  const text = fichaText(data, pet.id, todayLocal());
  const share = (navigator as any).share ? h("button", { type: "button", onClick: () => (navigator as any).share({ title: `Ficha de ${pet.name}`, text }).catch(() => undefined) }, "Compartir") : null;
  const dlg = h("dialog", { class: "ficha", "data-testid": "ficha" }, h("h2", {}, `Ficha de ${pet.name}`), h("pre", {}, text),
    h("div", { class: "actions" },
      h("button", { type: "button", class: "primary", onClick: async (e: Event) => { const b = e.target as HTMLButtonElement; try { await navigator.clipboard.writeText(text); b.textContent = "Copiado"; } catch { (b.closest("dialog")!.querySelector("pre") as HTMLElement).focus(); b.textContent = "Selecciona y copia"; } } }, "Copiar texto"),
      share, h("button", { type: "button", class: "ghost", onClick: () => { ficha = false; render(); } }, "Cerrar")));
  queueMicrotask(() => { try { (dlg as HTMLDialogElement).showModal(); } catch { /* sin soporte: se ve en línea */ } });
  dlg.addEventListener("cancel", () => { ficha = false; });
  return dlg;
}

function petPage(pet: Pet): HTMLElement {
  const today = todayLocal();
  const age = pet.birth ? ageLabel(pet.birth, today) : "";
  const w = weightSeries(data, pet.id).at(-1);
  const spent = totalSpent(data, pet.id);
  const rem = reminders(data, pet.id, today);
  const hist = history(data, pet.id, filter || undefined);
  const chartEl = chart(pet);
  return h("div", { class: "pet" },
    h("section", { class: "carnet", "aria-label": `Carnet de ${pet.name}`, "data-testid": "carnet" },
      avatar(pet, true),
      h("div", { class: "id" }, h("h2", {}, pet.name), h("p", { class: "meta" }, [pet.species === "perro" ? "Perro" : "Gato", pet.breed, pet.sex, age].filter(Boolean).join(" · "))),
      h("dl", {}, h("div", {}, h("dt", {}, "Último peso"), h("dd", { "data-testid": "last-weight" }, w ? `${kg(w.grams)} kg` : "Sin registrar")), h("div", {}, h("dt", {}, "Gastos anotados"), h("dd", { "data-testid": "spent" }, spent ? formatMoney(spent, data.currency) : "Sin registrar"))),
      h("div", { class: "carnet-actions" }, h("button", { type: "button", onClick: () => { ficha = true; render(); } }, icon("share", 18), " Ficha"), h("button", { type: "button", "aria-label": `Editar los datos de ${pet.name}`, onClick: () => { Object.assign(petForm, { name: pet.name, species: pet.species, breed: pet.breed, birth: pet.birth, sex: pet.sex, photo: "", notes: pet.notes }); editingPet = pet.id; adding = true; msg = null; render(); } }, "Editar"))),
    h("section", { "aria-labelledby": "next" }, h("h3", { id: "next" }, "Lo próximo"),
      rem.length === 0 ? h("p", { class: "hint", "data-testid": "no-reminders" }, `Nada pendiente. Al anotar una vacuna o una desparasitación, pon la próxima fecha y ${pet.name} la verá aquí.`) :
        h("ul", { class: "reminders", "data-testid": "reminders" }, ...rem.map((r) => h("li", { class: r.state }, icon(r.rec.type), h("span", { class: "main" }, r.rec.title || REC_LABEL[r.rec.type], h("span", { class: "sub" }, `${r.rec.next} · ${dayLabel(r.daysLeft)}`)), h("span", { class: `chip ${r.state}` }, r.state === "expired" ? "Atrasada" : r.state === "ok" ? "Al día" : "Pronto"))))),
    h("section", { "aria-labelledby": "add" }, h("h3", { id: "add" }, "Anotar algo nuevo"),
      h("div", { class: "types", role: "group", "aria-label": "Tipo de registro" }, ...REC_TYPES.map((t) => h("button", { type: "button", class: `type ${t}`, "aria-pressed": String(t === recType), onClick: () => { recType = t; render(); } }, icon(t, 18), REC_LABEL[t]))),
      recordForm(pet)),
    chartEl && h("section", {}, h("h3", {}, "Peso en el tiempo"), chartEl),
    spendSection(pet),
    h("section", { "aria-labelledby": "hist" }, h("h3", { id: "hist" }, "Historial"),
      h("div", { class: "field filter" }, h("label", { for: "filter" }, "Mostrar"), h("select", { id: "filter", onChange: (e: Event) => { filter = (e.target as HTMLSelectElement).value as RecType | ""; render(); } }, h("option", { value: "" }, "Todo"), ...REC_TYPES.map((t) => h("option", { value: t, selected: filter === t }, REC_LABEL[t])))),
      hist.length === 0 ? h("p", { class: "hint" }, "Todavía no hay registros. Empieza por la última vacuna o el peso de hoy.") :
        h("ol", { class: "timeline", "data-testid": "history" }, ...hist.map((r) => h("li", { class: r.type }, icon(r.type, 20),
          h("div", { class: "main" }, h("strong", {}, r.type === "peso" && r.weightG ? `${kg(r.weightG)} kg` : r.title || REC_LABEL[r.type]), h("span", { class: "sub" }, `${REC_LABEL[r.type]} · ${r.date}${r.detail ? " · " + r.detail : ""}${r.amount ? " · " + formatMoney(r.amount, data.currency) : ""}`)),
          h("button", { type: "button", class: "ghost small", "aria-label": `Editar ${REC_LABEL[r.type]} del ${r.date}`, onClick: () => startEditRec(r.id) }, "Editar"),
          h("button", { type: "button", class: "ghost small", "aria-label": `Quitar ${REC_LABEL[r.type]} del ${r.date}`, onClick: () => { commit(removeRecord(data, r.id)); render(); } }, "Quitar"))))),
    h("section", { class: "foot-tools" },
      history(data, pet.id).length > 0 && h("button", { type: "button", onClick: () => { const url = URL.createObjectURL(new Blob(["﻿" + toCsv(data, pet.id)], { type: "text/csv" })); const a = h("a", { href: url, download: `historial-${pet.name}.csv` }); document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); } }, "Descargar historial (CSV)"),
      confirmDelete ? h("span", { class: "confirm" }, `¿Borrar a ${pet.name} y todo su historial?`, h("button", { type: "button", class: "danger", onClick: () => { commit(removePet(data, pet.id)); currentId = data.pets[0]?.id ?? ""; adding = data.pets.length === 0; confirmDelete = false; render(); } }, "Sí, borrar"), h("button", { type: "button", class: "ghost", onClick: () => { confirmDelete = false; render(); } }, "No")) :
        h("button", { type: "button", class: "ghost", onClick: () => { confirmDelete = true; render(); } }, icon("trash", 16), ` Borrar a ${pet.name}`),
      h("p", { class: "hint" }, "Huella al Día no hace diagnósticos ni reemplaza al veterinario. Ante cualquier duda de salud, consúltalo.")),
  );
}

function render(): void {
  const pet = data.pets.find((p) => p.id === currentId) ?? data.pets[0];
  if (pet) currentId = pet.id;
  replaceChildren(root,
    data.pets.length > 0 && h("nav", { class: "pets", "aria-label": "Mascotas" }, ...data.pets.map((p) => h("button", { type: "button", class: "chipet", "aria-current": !adding && p.id === currentId ? "true" : null, onClick: () => { currentId = p.id; adding = false; confirmDelete = false; filter = ""; render(); } }, avatar(p), p.name)), data.pets.length < MAX_PETS && h("button", { type: "button", class: "chipet add", onClick: () => { adding = true; render(); } }, "+ Mascota")),
    msg && h("p", { class: `note ${msg.kind}`, role: msg.kind === "error" ? "alert" : "status" }, msg.text),
    adding || !pet ? newPetForm() : petPage(pet),
    backupPanel({ app: "huella-al-dia", keys: [KEY] }),
    ficha && pet && fichaDialog(pet),
  );
}
render();
