import { currencyDigits, formatMoney, h, loadJson, parseAmount, replaceChildren, saveJson } from "../../../packages/ui/src/index.ts";
import type { MovementType } from "../../../packages/core/src/index.ts";
import { addMovement, closeDay, emptyDraft, parseDraft, parseHistory, removeMovement, toCsv, TYPE_LABEL, TYPES, type ClosedDay, type Draft } from "./state.ts";

const CURRENCIES = ["COP", "USD", "EUR", "MXN", "ARS", "PEN", "CLP", "BRL"];
const DRAFT_KEY = "cajaclara.draft.v1", HIST_KEY = "cajaclara.history.v1";
let draft: Draft = loadJson(DRAFT_KEY, parseDraft, emptyDraft());
let history: ClosedDay[] = loadJson(HIST_KEY, parseHistory, []);
let message: { kind: "ok" | "error"; text: string } | null = null;
let form = { openingText: draft.opening === null ? "" : String(draft.opening / 10 ** currencyDigits(draft.currency)), type: "cash_sale" as MovementType, amount: "", note: "", counted: "", date: new Date().toISOString().slice(0, 10) };
const root = document.getElementById("app")!;
const money = (m: number) => formatMoney(m, draft.currency);
const persist = () => { if (!saveJson(DRAFT_KEY, draft)) message = { kind: "error", text: "No se pudo guardar en este navegador (¿modo privado?). Exporta tus cierres." }; };
const set = (d: Draft) => { draft = d; persist(); render(); };

function addRow(): void {
  const digits = currencyDigits(draft.currency);
  const amt = parseAmount(form.amount, digits);
  if (amt === null || amt <= 0) { message = { kind: "error", text: "Escribe un monto válido mayor que cero." }; return render(); }
  message = null; form.amount = ""; form.note = "";
  set(addMovement(draft, form.type, amt, form.note || ""));
}

function expected() {
  const digits = currencyDigits(draft.currency);
  const opening = form.openingText.trim() === "" ? 0 : parseAmount(form.openingText, digits);
  return { opening, digits };
}

function render(): void {
  const { opening, digits } = expected();
  const counted = form.counted.trim() === "" ? null : parseAmount(form.counted, digits);
  let result = null as ReturnType<typeof closeDay> | null;
  if (opening !== null && counted !== null) result = closeDay({ ...draft, opening }, counted, form.date, "preview");
  const preview = opening !== null ? closeDay({ ...draft, opening }, 0, form.date, "p").result : null;

  const t = preview?.totals;
  replaceChildren(
    root,
    message && h("p", { class: `note ${message.kind}`, role: message.kind === "error" ? "alert" : "status" }, message.text),
    h("section", { class: "panel", "aria-labelledby": "s1" },
      h("h2", { id: "s1" }, "1. Abre la caja"),
      h("div", { class: "row" },
        h("div", { class: "field" }, h("label", { for: "cur" }, "Moneda"),
          h("select", { id: "cur", onChange: (e: Event) => { const c = (e.target as HTMLSelectElement).value; draft = { ...emptyDraft(c) }; form.openingText = ""; form.counted = ""; persist(); render(); } },
            ...CURRENCIES.map((c) => h("option", { value: c, selected: c === draft.currency }, c)))),
        h("div", { class: "field" }, h("label", { for: "open" }, "Fondo inicial (efectivo con el que abres)"),
          h("input", { id: "open", type: "text", inputmode: "decimal", autocomplete: "off", value: form.openingText, onInput: (e: Event) => { form.openingText = (e.target as HTMLInputElement).value; const o = expected().opening; draft = { ...draft, opening: o }; persist(); updateResult(); } })),
      )),
    h("section", { class: "panel", "aria-labelledby": "s2" },
      h("h2", { id: "s2" }, "2. Anota lo que pasó en el día"),
      h("div", { class: "row" },
        h("div", { class: "field" }, h("label", { for: "type" }, "Tipo"),
          h("select", { id: "type", onChange: (e: Event) => { form.type = (e.target as HTMLSelectElement).value as MovementType; } },
            ...TYPES.map((x) => h("option", { value: x, selected: x === form.type }, TYPE_LABEL[x])))),
        h("div", { class: "field" }, h("label", { for: "amount" }, "Monto"),
          h("input", { id: "amount", type: "text", inputmode: "decimal", autocomplete: "off", value: form.amount, onInput: (e: Event) => { form.amount = (e.target as HTMLInputElement).value; }, onKeydown: (e: KeyboardEvent) => { if (e.key === "Enter") { e.preventDefault(); addRow(); } } })),
      ),
      h("div", { class: "field" }, h("label", { for: "note" }, "Nota (opcional)"),
        h("input", { id: "note", type: "text", maxlength: "80", autocomplete: "off", value: form.note, onInput: (e: Event) => { form.note = (e.target as HTMLInputElement).value; } })),
      h("button", { type: "button", class: "primary", onClick: addRow }, "Añadir movimiento"),
      draft.movements.length === 0
        ? h("p", { class: "hint" }, "Aún no hay movimientos. Las ventas fiadas no suman al efectivo; los cobros de fiado sí.")
        : h("ul", { class: "moves", "data-testid": "moves" },
            ...draft.movements.map((m) =>
              h("li", {}, h("span", { class: "main" }, TYPE_LABEL[m.type], m.note ? h("span", { class: "sub" }, m.note) : null),
                h("span", { class: "amt" }, money(m.amount)),
                h("button", { type: "button", class: "ghost", "aria-label": `Quitar ${TYPE_LABEL[m.type]} de ${money(m.amount)}`, onClick: () => set(removeMovement(draft, m.id)) }, "Quitar")))),
    ),
    h("section", { class: "panel", "aria-labelledby": "s3" },
      h("h2", { id: "s3" }, "3. Cuenta el efectivo y cierra"),
      h("div", { class: "row" },
        h("div", { class: "field" }, h("label", { for: "counted" }, "Efectivo contado en la caja"),
          h("input", { id: "counted", type: "text", inputmode: "decimal", autocomplete: "off", value: form.counted, onInput: (e: Event) => { form.counted = (e.target as HTMLInputElement).value; updateResult(); } })),
        h("div", { class: "field" }, h("label", { for: "date" }, "Fecha"),
          h("input", { id: "date", type: "date", value: form.date, onInput: (e: Event) => { form.date = (e.target as HTMLInputElement).value; } })),
      ),
      h("div", { id: "result", "aria-live": "polite", "data-testid": "result" }),
    ),
    t && h("p", { class: "hint", "data-testid": "totals" }, `Ventas del día: ${money(t.totalSales)} (efectivo ${money(t.cashSales)}, tarjeta ${money(t.cardSales)}, transferencia ${money(t.transferSales)}, fiado ${money(t.creditSales)}).`),
    historySection(),
  );
  void result;
  updateResult();
}

function updateResult(): void {
  const el = document.getElementById("result");
  if (!el) return;
  const { opening, digits } = expected();
  if (opening === null) return replaceChildren(el, h("p", { class: "hint" }, "El fondo inicial no es un monto válido."));
  const counted = form.counted.trim() === "" ? null : parseAmount(form.counted, digits);
  const exp = closeDay({ ...draft, opening }, 0, form.date, "p").result.expectedCash;
  if (counted === null) return replaceChildren(el, h("p", { class: "label" }, "Debería haber en la caja: ", h("strong", { "data-testid": "expected" }, money(exp))), h("p", { class: "hint" }, "Cuenta el efectivo y escríbelo arriba para ver la diferencia."));
  const diff = counted - exp;
  const verdict = diff === 0 ? "La caja cuadra." : diff < 0 ? `Faltan ${money(-diff)}.` : `Sobran ${money(diff)}.`;
  replaceChildren(el,
    h("div", { class: `result ${diff === 0 ? "even" : diff < 0 ? "short" : "over"}` },
      h("p", { class: "label" }, "Debería haber: ", h("strong", { "data-testid": "expected" }, money(exp)), " · Contaste: ", money(counted)),
      h("p", { class: "big", "data-testid": "verdict" }, verdict),
      h("p", { class: "hint" }, "Esperado = fondo inicial + ventas en efectivo + cobros de fiado + ingresos − gastos − retiros."),
      h("button", { type: "button", class: "primary", onClick: saveClose }, "Guardar cierre del día")));
}

function saveClose(): void {
  const { opening, digits } = expected();
  const counted = parseAmount(form.counted, digits);
  if (opening === null || counted === null || !/^\d{4}-\d{2}-\d{2}$/.test(form.date)) { message = { kind: "error", text: "Revisa el fondo, el efectivo contado y la fecha." }; return render(); }
  const c = closeDay({ ...draft, opening }, counted, form.date, `${Date.now()}`);
  history = [c, ...history].slice(0, 400);
  saveJson(HIST_KEY, history);
  draft = emptyDraft(draft.currency); form.counted = ""; form.openingText = ""; persist();
  message = { kind: "ok", text: `Cierre del ${c.date} guardado. Caja nueva lista.` };
  render();
}

function historySection(): HTMLElement {
  return h("section", { "aria-labelledby": "s4" },
    h("h2", { id: "s4" }, "Cierres guardados"),
    history.length === 0 ? h("p", { class: "hint" }, "Todavía no has guardado ningún cierre.") :
      h("ul", { class: "moves", "data-testid": "history" },
        ...history.map((c) => {
          const f = (m: number) => formatMoney(m, c.currency);
          const d = c.result.difference;
          return h("li", {}, h("span", { class: "main" }, c.date, h("span", { class: "sub" }, `Ventas ${f(c.result.totals.totalSales)}`)),
            h("span", { class: `amt ${d < 0 ? "minus" : d > 0 ? "plus" : ""}` }, d === 0 ? "Cuadra" : (d < 0 ? "−" : "+") + f(Math.abs(d))));
        })),
    history.length > 0 && h("div", { class: "actions" },
      h("button", { type: "button", onClick: exportCsv }, "Descargar CSV"),
      h("button", { type: "button", class: "ghost", onClick: () => { if (confirm("¿Borrar todos los cierres guardados en este dispositivo?")) { history = []; saveJson(HIST_KEY, history); render(); } } }, "Borrar historial")),
  );
}

function exportCsv(): void {
  const url = URL.createObjectURL(new Blob(["﻿" + toCsv(history)], { type: "text/csv" }));
  const a = h("a", { href: url, download: "cierres-caja-clara.csv" });
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

render();
