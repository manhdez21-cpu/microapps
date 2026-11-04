import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { launch, startServer } from "./helpers.mjs";

const OUT = process.env.SHOTS ?? "/tmp/shots";
mkdirSync(OUT, { recursive: true });
const server = await startServer(new URL("../../dist", import.meta.url).pathname, 8132);
const browser = await launch();
let failures = 0;
const step = async (name, fn) => { try { await fn(); console.log("  ok  ", name); } catch (e) { failures++; console.log("  FAIL", name, "\n      ", e.message.split("\n").slice(0, 3).join(" | ")); } };
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
const ymd = (o) => { const d = new Date(); d.setDate(d.getDate() + o); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const openForm = () => page.evaluate(() => document.querySelector("details.add-wrap")?.setAttribute("open", ""));
const noOverflow = async () => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
// PNG 1x1 válido para probar adjuntos
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
writeFileSync(`${OUT}/factura.png`, PNG);

console.log("ExpiryHub (documentos)");
await page.goto("http://127.0.0.1:8132/apps/expiryhub/index.html");
const addDoc = async (title, off, cat = "otro") => {
  await openForm();
  await page.locator("#cat").selectOption(cat);
  await openForm(); // el cambio de tipo vuelve a pintar y cierra el desplegable
  await page.locator("#title").fill(title);
  await page.locator("#expiry").fill(ymd(off));
  await page.getByRole("button", { name: "Añadir documento", exact: true }).last().click();
};
await step("fecha vacía muestra error", async () => {
  await page.locator("#title").fill("SOAT");
  await page.getByRole("button", { name: "Añadir documento", exact: true }).last().click();
  assert.equal(await page.getByRole("alert").count(), 1);
});
await step("agrupa vencido / hoy / en aviso / más adelante", async () => {
  await addDoc("Seguro", -2, "seguro");
  await addDoc("Plan celular", 0, "suscripcion");
  await addDoc("SOAT", 12, "soat");
  await addDoc("Licencia", 300, "licencia");
  for (const g of ["expired", "today", "soon", "later"]) assert.equal(await page.getByTestId(`group-${g}`).locator("li.doc").count(), 1, g);
  assert.match(await page.getByTestId("summary").innerText(), /3 documentos necesitan atención/);
});
await step("perfil nuevo y documento en ese perfil", async () => {
  await page.locator("#np").fill("Mi carro");
  await page.getByRole("button", { name: "Crear perfil" }).click();
  await addDoc("Revisión técnica", 40, "permiso");
  assert.equal(await page.getByTestId("group-later").locator("li.doc").count(), 1);
  await page.getByRole("button", { name: "Todos", exact: true }).click();
  assert.equal(await page.locator("li.doc").count(), 5);
});
await step("renovar guarda historial y mueve el documento", async () => {
  const li = page.locator("li.doc", { hasText: "Seguro" });
  await li.getByRole("button", { name: "Renovar" }).click();
  await li.locator("input[type=date]").fill(ymd(365));
  await li.getByRole("button", { name: "Guardar renovación" }).click();
  assert.equal(await page.getByTestId("group-expired").count(), 0);
  assert.match(await page.getByTestId("renewals").innerText(), /Seguro/);
});
await step("calendario muestra los vencimientos del mes", async () => {
  await page.getByRole("tab", { name: "Calendario" }).click();
  assert.equal(await page.getByTestId("month").count(), 1);
  assert.equal(await page.locator("td.today").count(), 1);
  await page.getByRole("tab", { name: "Próximos" }).click();
});
await step("adjunta una imagen y la abre en el visor", async () => {
  const li = page.locator("li.doc", { hasText: "SOAT" });
  await li.locator(".attach input").setInputFiles(`${OUT}/factura.png`);
  await li.getByRole("button", { name: "Ver adjunto" }).waitFor();
  await li.getByRole("button", { name: "Ver adjunto" }).click();
  await page.getByTestId("viewer").waitFor({ timeout: 5000 });
  await page.getByRole("button", { name: "Cerrar" }).click();
});
await step("persiste al recargar, exporta .ics y CSV", async () => {
  await page.reload();
  assert.equal(await page.locator("li.doc").count(), 5);
  const [ics] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /\.ics/ }).click()]);
  assert.equal(ics.suggestedFilename(), "vencimientos.ics");
  const [csv] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Descargar CSV" }).click()]);
  assert.equal(csv.suggestedFilename(), "vencimientos.csv");
});
await step("quitar pide confirmación y no desborda", async () => {
  await page.getByRole("button", { name: "Quitar Licencia" }).click();
  await page.getByRole("button", { name: "Sí, quitar" }).click();
  assert.equal(await page.locator("li.doc").count(), 4);
  await noOverflow();
  await page.screenshot({ path: `${OUT}/expiryhub-mobile.png`, fullPage: true });
});
await step("tolera datos corruptos", async () => {
  await page.evaluate(() => localStorage.setItem("expiryhub.v2", "{x"));
  await page.reload();
  assert.match(await page.locator("h1").innerText(), /ExpiryHub/);
});

console.log("Warranty Keeper");
await page.goto("http://127.0.0.1:8132/apps/warranty-keeper/index.html");
const addW = async (name, o) => {
  await openForm();
  await page.locator("#name").fill(name);
  if (o.brand) await page.locator("#brand").fill(o.brand);
  if (o.store) await page.locator("#store").fill(o.store);
  await page.locator("#purchase").fill(o.purchase);
  await page.locator("#months").fill(String(o.months));
  await page.getByRole("button", { name: "Guardar garantía" }).click();
};
await step("meses inválidos muestran error", async () => {
  await page.locator("#name").fill("Nevera");
  await page.locator("#purchase").fill(ymd(-10));
  await page.locator("#months").fill("0");
  await page.getByRole("button", { name: "Guardar garantía" }).click();
  assert.match(await page.getByRole("alert").innerText(), /1 a 240/);
});
await step("calcula el fin y ordena vigentes antes que terminadas", async () => {
  await addW("Nevera", { brand: "Samsung", store: "Éxito", purchase: ymd(-350), months: 12 });
  await addW("Celular", { brand: "Xiaomi", store: "Claro", purchase: ymd(-800), months: 24 });
  await addW("Televisor", { brand: "LG", store: "Alkosto", purchase: ymd(-40), months: 36 });
  const names = await page.locator(".ticket .t-name").allInnerTexts();
  assert.deepEqual(names, ["NEVERA", "TELEVISOR", "CELULAR"].map((x) => x));
  assert.match(await page.getByTestId("summary").innerText(), /2 garantías vigentes de 3/);
  assert.match(await page.locator(".ticket.expired .stamp").innerText(), /TERMINÓ/);
});
await step("busca sin tildes y filtra por estado", async () => {
  await page.locator("#q").fill("exito");
  assert.equal(await page.locator("li.ticket").count(), 1);
  await page.locator("#q").fill("zzz");
  assert.equal(await page.getByTestId("no-results").count(), 1);
  await page.locator("#q").fill("");
  await page.getByRole("button", { name: "Terminadas" }).click();
  assert.equal(await page.locator("li.ticket").count(), 1);
  await page.getByRole("button", { name: "Todas", exact: true }).click();
});
await step("adjunta factura y persiste", async () => {
  const t = page.locator("li.ticket", { hasText: "NEVERA" });
  await t.locator(".attach input").setInputFiles(`${OUT}/factura.png`);
  await page.locator("li.ticket", { hasText: "NEVERA" }).getByRole("button", { name: "Ver factura" }).waitFor();
  await page.reload();
  assert.equal(await page.locator("li.ticket").count(), 3);
  await page.locator("li.ticket", { hasText: "NEVERA" }).getByRole("button", { name: "Ver factura" }).click();
  await page.getByTestId("viewer").waitFor({ timeout: 5000 });
  await page.getByRole("button", { name: "Cerrar" }).click();
});
await step("CSV, quitar con confirmación y sin desborde", async () => {
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Descargar CSV" }).click()]);
  assert.equal(dl.suggestedFilename(), "garantias.csv");
  await page.getByRole("button", { name: "Quitar Celular" }).click();
  await page.getByRole("button", { name: "Sí, quitar" }).click();
  assert.equal(await page.locator("li.ticket").count(), 2);
  await noOverflow();
  await page.screenshot({ path: `${OUT}/warranty-mobile.png`, fullPage: true });
});
await step("consola limpia", async () => assert.deepEqual(errors, []));
await browser.close(); server.stop();
console.log(failures ? `${failures} FALLOS` : "TODO OK");
process.exit(failures ? 1 : 0);
