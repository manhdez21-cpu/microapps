// Build sin dependencias: compila TS con `tsc` y copia los recursos estáticos a dist/ conservando la estructura.
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, readdirSync, statSync, existsSync, rmSync } from "node:fs";
import { join, extname } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const dist = join(root, "dist");
if (existsSync(dist)) rmSync(dist, { recursive: true, force: true });
execFileSync("tsc", ["-p", "tsconfig.web.json"], { cwd: root, stdio: "inherit" });

const STATIC = new Set([".html", ".css", ".json", ".svg", ".png", ".webmanifest", ".js", ".txt", ".xml", ".ttf"]);
function copyStatic(dir) {
  for (const name of readdirSync(join(root, dir))) {
    const rel = join(dir, name);
    const abs = join(root, rel);
    if (name === "node_modules" || name === "test" || name === "src" && dir.startsWith("apps/")) {
      if (name === "src" && dir.startsWith("apps/")) copySrcStatic(rel);
      continue;
    }
    if (statSync(abs).isDirectory()) copyStatic(rel);
    else if (STATIC.has(extname(name))) {
      mkdirSync(join(dist, dir), { recursive: true });
      cpSync(abs, join(dist, rel));
    }
  }
}
function copySrcStatic(dir) {
  for (const name of readdirSync(join(root, dir))) {
    const rel = join(dir, name);
    if (statSync(join(root, rel)).isDirectory()) copySrcStatic(rel);
    else if (extname(name) === ".json") {
      mkdirSync(join(dist, dir), { recursive: true });
      cpSync(join(root, rel), join(dist, rel));
    }
  }
}
for (const app of readdirSync(join(root, "apps"))) copyStatic(join("apps", app));
copyStatic("packages/ui/src");
for (const name of readdirSync(join(root, "site"))) { mkdirSync(dist, { recursive: true }); cpSync(join(root, "site", name), join(dist, name), { recursive: true }); }
execFileSync("node", [join(root, "tools/gen-seo.mjs")], { stdio: "inherit" });
console.log("build ok →", dist);
