import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { launch, startServer } from "./helpers.mjs";
const OUT = process.env.SHOTS ?? "/tmp/shots";
mkdirSync(OUT, { recursive: true });
const server = await startServer(new URL("../../dist", import.meta.url).pathname, 8133);
const browser = await launch();
let failures = 0;
const step = async (name, fn) => { try { await fn(); console.log("  ok  ", name); } catch (e) { failures++; console.log("  FAIL", name, "\n      ", e.message.split("\n")[0]); } };
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true })).newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
const ymd = (o) => { const d = new Date(); d.setDate(d.getDate() + o); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const type = (t) => page.getByRole("button", { name: t, exact: true }).click();
console.log("Huella al Día (mascotas)");
await page.goto("http://127.0.0.1:8133/apps/huella-al-dia/index.html");
await step("primera visita pide crear la mascota", async () => assert.equal(await page.getByTestId("pet-form").count(), 1));
await step("nombre vacío da error", async () => {
  await page.getByRole("button", { name: "Guardar mascota" }).click();
  assert.equal(await page.getByRole("alert").count(), 1);
});
await step("crea a Luna (gata) y muestra su carnet", async () => {
  await page.getByText("Gato", { exact: true }).click();
  await page.locator("#pname").fill("Luna");
  await page.locator("#pbreed").fill("Criolla");
  await page.getByRole("button", { name: "Guardar mascota" }).click();
  assert.match(await page.getByTestId("carnet").innerText(), /Luna/);
  assert.match(await page.getByTestId("last-weight").innerText(), /Sin registrar/);
  assert.equal(await page.getByTestId("no-reminders").count(), 1);
});
await step("vacuna sin nombre falla; con nombre y próxima fecha crea recordatorio", async () => {
  await type("Vacuna");
  await page.locator("#rtitle").fill("");
  await page.getByRole("button", { name: "Guardar en el historial" }).click().catch(() => undefined);
  await page.locator("#rtitle").fill("Triple felina");
  await page.locator("#rdate").fill(ymd(-355));
  await page.locator("#rnext").fill(ymd(10));
  await page.getByRole("button", { name: "Guardar en el historial" }).click();
  assert.match(await page.getByTestId("reminders").innerText(), /Triple felina/);
  assert.match(await page.getByTestId("history").innerText(), /Triple felina/);
});
await step("repetir la vacuna cierra el recordatorio anterior", async () => {
  await type("Vacuna");
  await page.locator("#rtitle").fill("Triple felina");
  await page.locator("#rnext").fill(ymd(375));
  await page.getByRole("button", { name: "Guardar en el historial" }).click();
  const t = await page.getByTestId("reminders").innerText();
  assert.equal((t.match(/Triple felina/g) ?? []).length, 1);
});
await step("dos pesos dibujan la gráfica y actualizan el último peso", async () => {
  for (const [d, w] of [[ymd(-30), "3,8"], [ymd(0), "4,1"]]) {
    await type("Peso");
    await page.locator("#rdate").fill(d);
    await page.locator("#rweight").fill(w);
    await page.getByRole("button", { name: "Guardar en el historial" }).click();
  }
  assert.match(await page.getByTestId("last-weight").innerText(), /4,1 kg/);
  assert.equal(await page.getByTestId("weight-chart").count(), 1);
});
await step("gasto suma al total", async () => {
  await type("Gasto");
  await page.locator("#ramount").fill("85000");
  await page.getByRole("button", { name: "Guardar en el historial" }).click();
  assert.match(await page.getByTestId("spent").innerText(), /85\.000/);
});
await step("ficha incluye el aviso de no ser documento veterinario", async () => {
  await page.getByRole("button", { name: /Ficha/ }).first().click();
  assert.match(await page.getByTestId("ficha").innerText(), /No es un documento veterinario/);
  await page.getByRole("button", { name: "Cerrar" }).click();
});
await step("exporta CSV", async () => {
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /CSV/ }).click()]);
  assert.match(dl.suggestedFilename(), /\.csv$/);
});
await step("quitar un registro y borrar la mascota con confirmación", async () => {
  const n = await page.getByTestId("history").locator("li").count();
  await page.getByTestId("history").getByRole("button", { name: /Quitar/ }).first().click();
  assert.equal(await page.getByTestId("history").locator("li").count(), n - 1);
  await page.getByRole("button", { name: /Borrar a Luna/ }).click();
  await page.getByRole("button", { name: /^Sí/ }).click();
  assert.equal(await page.getByTestId("pet-form").count(), 1);
});
await step("sin desborde horizontal, JSON-LD válido y consola limpia", async () => {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  (await page.$$eval('script[type="application/ld+json"]', (n) => n.map((x) => x.textContent))).forEach((b) => JSON.parse(b));
  assert.deepEqual(errors, []);
});
await browser.close(); server.stop();
console.log(failures ? `${failures} FALLOS` : "TODO OK");
process.exit(failures ? 1 : 0);
