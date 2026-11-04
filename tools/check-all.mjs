// Verificación completa: build, tipos, pruebas unitarias y todas las E2E. Código de salida ≠ 0 si algo falla.
import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";
const root = new URL("..", import.meta.url).pathname;
const run = (cmd, args) => execFileSync(cmd, args, { cwd: root, stdio: "inherit" });
run("node", ["tools/build.mjs"]);
run("tsc", ["-p", "tsconfig.web.json", "--noEmit"]);
run("tsc", ["-p", "packages/core/tsconfig.json", "--noEmit"]);
run("node", ["tools/gen-status.mjs"]);
run("node", ["tools/build.mjs"]); // vuelve a copiar status.json actualizado a dist/
const bad = JSON.parse((await import("node:fs")).readFileSync(join(root, "apps/control-center/data/status.json"), "utf8")).tests.filter((t) => t.fail > 0 || t.pass !== t.tests);
if (bad.length) { console.error("Pruebas unitarias con fallos:", bad); process.exit(1); }
run("node", ["--test", "tests/tools/seo.test.mjs", "tests/tools/ga4.test.mjs"]);
for (const f of readdirSync(join(root, "tests/e2e")).filter((f) => f.endsWith(".e2e.mjs"))) run("node", [join("tests/e2e", f)]);
console.log("check-all: TODO OK");
