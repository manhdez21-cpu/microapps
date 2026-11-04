// Ejecuta todas las pruebas del repo y escribe apps/control-center/data/status.json (datos REALES de pruebas).
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const suites = [];
for (const base of ["packages", "apps"]) {
  for (const name of readdirSync(join(root, base))) {
    const dir = join(root, base, name, "test");
    if (!existsSync(dir)) continue;
    const files = readdirSync(dir).filter((f) => f.endsWith(".test.ts")).map((f) => join(dir, f));
    if (files.length === 0) continue;
    let out = "";
    try { out = execFileSync("node", ["--test", ...files], { encoding: "utf8" }); }
    catch (e) { out = String(e.stdout ?? ""); }
    const n = (k) => Number(new RegExp(`^# ${k} (\\d+)`, "m").exec(out)?.[1] ?? NaN);
    suites.push({ name: `${base}/${name}`, tests: n("tests"), pass: n("pass"), fail: n("fail") });
  }
}
const registry = JSON.parse(readFileSync(join(root, "apps/control-center/data/registry.json"), "utf8"));
const status = { generatedAt: new Date().toISOString(), tests: suites, registry };
writeFileSync(join(root, "apps/control-center/data/status.json"), JSON.stringify(status, null, 2));
const total = suites.reduce((a, s) => a + s.tests, 0), pass = suites.reduce((a, s) => a + s.pass, 0);
console.log(`status.json: ${pass}/${total} pruebas pasan en ${suites.length} paquetes`);
