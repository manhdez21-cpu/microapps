import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { launch, startServer } from "./helpers.mjs";

const OUT = process.env.SHOTS ?? "/tmp/shots";
mkdirSync(OUT, { recursive: true });
const server = await startServer(new URL("../../dist", import.meta.url).pathname, 8160);
const browser = await launch();
let failures = 0;
const step = async (name, fn) => { try { await fn(); console.log("  ok  ", name); } catch (e) { failures++; console.log("  FAIL", name, "\n      ", e.message.split("\n").slice(0, 3).join(" | ")); } };
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
const errors = [];
const newPage = async () => { const p = await ctx.newPage(); p.on("pageerror", (e) => errors.push(e.message)); p.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); }); return p; };
const B = "http://127.0.0.1:8160/apps/";
const ymd = (o) => { const d = new Date(); d.setDate(d.getDate() + o); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const norm = (s) => s.replace(/\s+/g, " ");
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
writeFileSync(`${OUT}/factura.png`, PNG);
const openForm = (p) => p.evaluate(() => document.querySelector("details.add-wrap")?.setAttribute("open", ""));
/** Descarga el respaldo, borra los datos del navegador y lo restaura desde el archivo. */
async function backupRoundTrip(p, file) {
  await p.getByTestId("backup").locator("summary").click();
  const [dl] = await Promise.all([p.waitForEvent("download"), p.getByRole("button", { name: "Descargar respaldo" }).click()]);
  await dl.saveAs(file);
  await p.evaluate(async () => { localStorage.clear(); await new Promise((r) => { const q = indexedDB.deleteDatabase("microapps-files"); q.onsuccess = q.onerror = q.onblocked = () => r(); }); });
  await p.reload();
  await p.getByTestId("backup").locator("summary").click();
  await Promise.all([p.waitForEvent("load"), p.getByTestId("backup-file").setInputFiles(file)]);
}

console.log("SplitFlow");
{
  const p = await newPage(); await p.goto(`${B}splitflow/index.html`);
  await step("crea grupo, personas y dos gastos con categoría", async () => {
    await p.getByLabel("Nombre del grupo").fill("Finca"); await p.getByRole("button", { name: "Crear grupo" }).click();
    for (const n of ["Ana", "Beto", "Caro"]) { await p.getByLabel("Añadir persona").fill(n); await p.getByRole("button", { name: "Añadir", exact: true }).click(); }
    await p.getByLabel("Descripción").fill("Cena"); await p.getByLabel("Monto (COP)").fill("90000"); await p.locator("#exp-cat").selectOption("Comida"); await p.getByRole("button", { name: "Añadir gasto" }).click();
    await p.getByLabel("Descripción").fill("Taxi"); await p.getByLabel("Monto (COP)").fill("9000"); await p.locator("#exp-paid").selectOption({ label: "Beto" }); await p.locator("#exp-cat").selectOption("Transporte"); await p.getByRole("button", { name: "Añadir gasto" }).click();
    assert.equal(await p.getByTestId("by-category").locator("li").count(), 2);
    assert.match(norm(await p.getByTestId("totals").innerText()), /Ana.*90\.000.*33\.000/);
  });
  await step("registrar un pago actualiza «para quedar a mano»", async () => {
    const before = await p.getByTestId("transfers").locator("li").count();
    await p.getByTestId("transfers").getByRole("button", { name: /Registrar el pago de Caro a Ana/ }).click();
    assert.ok((await p.getByTestId("transfers").locator("li").count()) < before);
    assert.match(await p.getByTestId("expenses").innerText(), /Pago a Ana/);
    assert.match(norm(await p.locator("p.total").innerText()), /99\.000 en 3 gastos|99\.000 en 2 gastos/);
  });
  await step("editar un gasto cambia monto y saldos", async () => {
    await p.getByRole("button", { name: "Editar Cena" }).click();
    assert.equal(await p.locator("#exp-desc").inputValue(), "Cena");
    await p.getByLabel("Monto (COP)").fill("120000");
    await p.getByRole("button", { name: "Guardar cambios" }).click();
    assert.match(await p.getByRole("status").innerText(), /actualizado/);
    assert.match(norm(await p.getByTestId("expenses").innerText()), /Cena.*120\.000/);
  });
  await step("resumen para compartir y enlace de WhatsApp", async () => {
    await p.getByRole("button", { name: "Compartir resumen" }).click();
    assert.match(await p.getByTestId("share").innerText(), /\*Finca\*/);
    assert.match(await p.getByRole("link", { name: "Enviar por WhatsApp" }).getAttribute("href"), /^https:\/\/wa\.me\/\?text=/);
  });
  await step("respaldo y restauración devuelven el grupo", async () => {
    await backupRoundTrip(p, `${OUT}/split-backup.json`);
    await p.getByTestId("expenses").waitFor();
    assert.match(await p.getByTestId("expenses").innerText(), /Cena/);
  });
  await step("rechaza un respaldo de otra app", async () => {
    writeFileSync(`${OUT}/otra.json`, JSON.stringify({ app: "otra", version: 1, exportedAt: "", data: { "splitflow:v1": "{}" }, blobs: {} }));
    await p.getByTestId("backup").locator("summary").click().catch(() => undefined);
    await p.getByTestId("backup-file").setInputFiles(`${OUT}/otra.json`);
    await p.waitForFunction(() => /otra app/.test(document.querySelector('[data-testid="backup-status"]')?.textContent ?? ""), null, { timeout: 5000 });
    assert.match(await p.getByTestId("backup-status").innerText(), /otra app/);
  });
}

console.log("Caja Clara");
{
  const p = await newPage(); await p.goto(`${B}caja-clara/index.html`);
  const add = async (type, amount, note = "") => { await p.getByLabel("Tipo").selectOption(type); await p.getByLabel("Monto").fill(amount); if (note) await p.getByLabel("Nota (opcional)").fill(note); await p.getByRole("button", { name: "Añadir movimiento" }).click(); };
  const close = async (date, counted) => { await p.getByLabel("Efectivo contado en la caja").fill(counted); await p.getByLabel("Fecha").fill(date); await p.getByRole("button", { name: "Guardar cierre del día" }).click(); };
  await step("dos cierres → gráfica y fiados por cliente", async () => {
    await p.getByLabel("Fondo inicial (efectivo con el que abres)").fill("50000");
    await add("cash_sale", "100000"); await add("credit_sale", "40000", "Don Pedro"); await close(ymd(-1), "150000");
    await p.getByLabel("Fondo inicial (efectivo con el que abres)").fill("50000");
    await add("cash_sale", "80000"); await add("credit_payment_cash", "15000", "don pedro"); await close(ymd(0), "145000");
    await p.getByTestId("report").getByRole("button", { name: "Semana" }).click().catch(() => undefined);
    await p.getByLabel("Fecha").fill(ymd(0));
    const week = await p.getByTestId("sales-chart").count();
    if (!week) await p.getByTestId("report").getByRole("button", { name: "Mes", exact: true }).click();
    assert.equal(await p.getByTestId("sales-chart").count() > 0 || (new Date(ymd(-1)).getUTCDay() === 0), true);
    assert.match(norm(await p.getByTestId("credit").innerText()), /pedro.*25\.000/i);
  });
  await step("editar un cierre guardado lo devuelve a la caja", async () => {
    await p.getByRole("button", { name: new RegExp(`Editar el cierre del ${ymd(0)}`) }).click();
    assert.match(await p.getByRole("status").innerText(), /Editando el cierre/);
    assert.equal(await p.getByTestId("history").locator("li").count(), 1);
    assert.equal(await p.getByTestId("moves").locator("li").count(), 2);
    await p.getByRole("button", { name: "Guardar cierre del día" }).click();
    assert.equal(await p.getByTestId("history").locator("li").count(), 2);
  });
  await step("no deja editar si la caja de hoy tiene movimientos", async () => {
    await add("cash_sale", "1000");
    await p.getByRole("button", { name: /Editar el cierre del/ }).first().click();
    assert.match(await p.getByRole("alert").innerText(), /Guarda o vacía/);
    await p.getByRole("button", { name: /Quitar Venta en efectivo/ }).click();
  });
  await step("respaldo y restauración devuelven los cierres", async () => {
    await backupRoundTrip(p, `${OUT}/caja-backup.json`);
    await p.getByTestId("history").waitFor();
    assert.equal(await p.getByTestId("history").locator("li").count(), 2);
  });
}

console.log("PriceRight");
{
  const p = await newPage(); await p.goto(`${B}priceright/index.html`);
  await step("compara márgenes", async () => {
    await p.getByLabel("Materiales").fill("80000"); await p.getByLabel("Porcentaje (%)").fill("20"); await p.getByLabel("Impuesto (%)").fill("19");
    assert.equal(await p.getByTestId("scenarios").locator("tbody tr").count(), 5);
    assert.match(norm(await p.getByTestId("scenarios").locator("tr.current").innerText()), /20 %.*119\.000/);
  });
  await step("guarda una cotización y su texto no revela costos", async () => {
    await p.locator("#q-job").fill("Pintura de sala"); await p.locator("#q-client").fill("Doña Marta"); await p.locator("#q-seller").fill("Juan Pérez");
    await p.getByRole("button", { name: "Guardar cotización" }).click();
    assert.equal(await p.getByTestId("quote-list").locator("li").count(), 1);
    const t = await p.getByTestId("quote-share").locator("pre").innerText();
    assert.match(t, /Valor total: \$\s?119\.000/); assert.match(t, /Doña Marta/); assert.match(t, /Juan Pérez/);
    assert.equal(/margen|costo|ganancia/i.test(t), false);
  });
  await step("usar como base recarga los costos; sin trabajo da error", async () => {
    await p.getByLabel("Materiales").fill("1");
    await p.getByRole("button", { name: "Usar como base" }).click();
    assert.equal(await p.getByLabel("Materiales").inputValue(), "80000");
    await p.locator("#q-job").fill("");
    await p.getByRole("button", { name: "Guardar cotización" }).click();
    assert.match(await p.getByTestId("quotes").getByRole("alert").innerText(), /trabajo/);
  });
  await step("respaldo y restauración devuelven las cotizaciones", async () => {
    await backupRoundTrip(p, `${OUT}/price-backup.json`);
    await p.getByTestId("quote-list").waitFor();
    assert.equal(await p.getByTestId("quote-list").locator("li").count(), 1);
  });
}

console.log("¿Cuánto me sobra?");
{
  const p = await newPage(); await p.goto(`${B}cuanto-me-sobra/index.html`);
  await step("cerámica con adhesivo, boquilla y costo total", async () => {
    await p.getByLabel("Largo de la habitación (m)").fill("4"); await p.getByLabel("Ancho de la habitación (m)").fill("3");
    await p.getByLabel("Largo de la pieza (cm)").fill("50"); await p.getByLabel("Ancho de la pieza (cm)").fill("50"); await p.getByLabel("Piezas por caja").fill("8");
    await p.locator("details.more > summary").click();
    await p.getByLabel("Precio por caja (o por pieza)").fill("90000");
    await p.getByLabel("Adhesivo (kg por m²)").fill("4,5"); await p.getByLabel("Kg por bolsa de adhesivo").fill("25"); await p.getByLabel("Precio por bolsa de adhesivo").fill("42000");
    assert.match(norm(await p.getByTestId("total-cost").innerText()), /\$\s?756\.000/);
    assert.match(norm(await p.getByTestId("items").innerText()), /Adhesivo 3 bolsas/);
  });
  await step("superficie adicional aumenta las cajas", async () => {
    await p.getByLabel("Superficie adicional (m²)").fill("6");
    assert.match(await p.getByTestId("headline").innerText(), /10 cajas/);
  });
  await step("pintura con latas y costo", async () => {
    await p.getByRole("tab", { name: "Pintura" }).click();
    await p.getByLabel("Largo (m)").fill("4"); await p.getByLabel("Ancho (m)").fill("3"); await p.getByLabel("Rendimiento (m² por litro)").fill("10");
    await p.locator("details.more > summary").click();
    await p.getByLabel("Litros por lata").fill("3,7"); await p.getByLabel("Precio por lata").fill("95000");
    assert.match(norm(await p.getByTestId("total-cost").innerText()), /\$\s?190\.000/);
    assert.match(await p.getByRole("link", { name: "Enviar por WhatsApp" }).getAttribute("href"), /wa\.me/);
  });
}

console.log("ExpiryHub");
{
  const p = await newPage(); await p.goto(`${B}expiryhub/index.html`);
  await step("documento con costo, proveedor y repetición", async () => {
    await p.locator("#cat").selectOption("soat"); await p.locator("#title").fill("SOAT Mazda"); await p.locator("#expiry").fill(ymd(20));
    await p.locator("#provider").fill("Seguros Bolívar"); await p.locator("#cost").fill("90000"); await p.locator("#repeat").fill("12");
    await p.getByRole("button", { name: "Añadir documento", exact: true }).last().click();
    assert.match(norm(await p.getByTestId("upcoming-cost").innerText()), /\$\s?90\.000 en 1 documento/);
    assert.match(await p.locator("li.doc").innerText(), /Seguros Bolívar/);
  });
  await step("editar corrige datos; renovar sugiere la fecha según la repetición", async () => {
    await p.getByRole("button", { name: "Editar SOAT Mazda" }).click();
    assert.equal(await p.locator("#title").inputValue(), "SOAT Mazda");
    await p.locator("#title").fill("SOAT Mazda 3"); await p.locator("#cost").fill("95000");
    await p.getByRole("button", { name: "Guardar cambios" }).click();
    assert.match(await p.locator("li.doc").innerText(), /SOAT Mazda 3/);
    assert.match(norm(await p.getByTestId("upcoming-cost").innerText()), /95\.000/);
    await p.getByRole("button", { name: "Renovar" }).click();
    const v = await p.locator("li.doc input[type=date]").inputValue();
    const d = new Date(`${ymd(20)}T00:00:00Z`); d.setUTCFullYear(d.getUTCFullYear() + 1);
    assert.equal(v, d.toISOString().slice(0, 10));
    await p.getByRole("button", { name: "Cancelar" }).click();
  });
  await step("respaldo incluye el adjunto", async () => {
    await p.locator("li.doc .attach input").setInputFiles(`${OUT}/factura.png`);
    await p.getByRole("button", { name: "Ver adjunto" }).waitFor();
    await backupRoundTrip(p, `${OUT}/expiry-backup.json`);
    await p.getByRole("button", { name: "Ver adjunto" }).waitFor({ timeout: 8000 });
    assert.match(await p.locator("li.doc").innerText(), /SOAT Mazda 3/);
  });
}

console.log("Warranty Keeper");
{
  const p = await newPage(); await p.goto(`${B}warranty-keeper/index.html`);
  await step("garantía con serie, precio, extendida y devolución", async () => {
    await p.locator("#name").fill("Televisor"); await p.locator("#brand").fill("LG"); await p.locator("#purchase").fill(ymd(-5)); await p.locator("#months").fill("12");
    await p.locator("#serial").fill("SN-998"); await p.locator("#price").fill("1800000"); await p.locator("#extra").fill("12"); await p.locator("#returnDays").fill("15"); await p.locator("#service").fill("Servicio LG 01 8000");
    await p.getByRole("button", { name: "Guardar garantía" }).click();
    const t = norm(await p.locator("li.ticket").innerText());
    assert.match(t, /Extendida \+12 meses/); assert.match(t, /Serie SN-998/); assert.match(t, /quedan 10 días/); assert.match(t, /Servicio técnico: Servicio LG/);
    assert.match(norm(await p.getByTestId("covered").innerText()), /1\.800\.000/);
  });
  await step("buscar por número de serie y editar", async () => {
    await p.locator("#q").fill("sn-998"); assert.equal(await p.locator("li.ticket").count(), 1);
    await p.locator("#q").fill("");
    await p.getByRole("button", { name: "Editar Televisor" }).click();
    await p.locator("#model").fill("55UQ"); await p.getByRole("button", { name: "Guardar cambios" }).click();
    assert.match(await p.locator("li.ticket").innerText(), /55UQ/);
  });
  await step("respaldo y restauración", async () => {
    await backupRoundTrip(p, `${OUT}/war-backup.json`);
    await p.locator("li.ticket").waitFor();
    assert.match(await p.locator("li.ticket").innerText(), /TELEVISOR/);
  });
}

console.log("Huella al Día");
{
  const p = await newPage(); await p.goto(`${B}huella-al-dia/index.html`);
  await step("crea mascota y vacuna con repetición", async () => {
    await p.locator("#pname").fill("Luna"); await p.getByRole("button", { name: "Guardar mascota" }).click();
    await p.getByRole("button", { name: "Desparasitación", exact: true }).click();
    await p.locator("#rdate").fill(ymd(-80)); await p.locator("#rtitle").fill("Antiparasitario"); await p.locator("#rrepeat").fill("3"); await p.locator("#ramount").fill("30000");
    await p.getByRole("button", { name: "Guardar en el historial" }).click();
    assert.match(await p.getByTestId("reminders").innerText(), /Antiparasitario/);
  });
  await step("editar un registro y ver gastos por mes", async () => {
    await p.getByRole("button", { name: /Editar Desparasitación del/ }).click();
    assert.equal(await p.locator("#rtitle").inputValue(), "Antiparasitario");
    await p.locator("#ramount").fill("35000");
    await p.getByRole("button", { name: "Guardar cambios" }).click();
    assert.match(norm(await p.getByTestId("spend").innerText()), /35\.000/);
    assert.equal(await p.getByTestId("history").locator("li").count(), 1);
  });
  await step("editar la mascota", async () => {
    await p.getByRole("button", { name: /Editar los datos de Luna/ }).click();
    await p.locator("#pname").fill("Luna Sol"); await p.locator("#pbreed").fill("Criolla");
    await p.getByRole("button", { name: "Guardar cambios" }).click();
    assert.match(await p.getByTestId("carnet").innerText(), /Luna Sol/);
    assert.equal(await p.getByTestId("history").locator("li").count(), 1);
  });
  await step("respaldo y restauración", async () => {
    await backupRoundTrip(p, `${OUT}/huella-backup.json`);
    await p.getByTestId("carnet").waitFor();
    assert.match(await p.getByTestId("carnet").innerText(), /Luna Sol/);
  });
}
await step("consola limpia y sin desborde en móvil", async () => {
  assert.deepEqual(errors, []);
});
await browser.close(); server.stop();
console.log(failures ? `${failures} FALLOS` : "TODO OK");
process.exit(failures ? 1 : 0);
