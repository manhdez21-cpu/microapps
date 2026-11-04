import { createRequire } from "node:module";
import { spawn } from "node:child_process";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? "/home/claude/.npm-global/lib/node_modules/playwright");

export async function startServer(dir, port) {
  const proc = spawn("python3", ["-m", "http.server", String(port), "--bind", "127.0.0.1", "--directory", dir], { stdio: "ignore" });
  for (let i = 0; i < 50; i++) {
    try { const r = await fetch(`http://127.0.0.1:${port}/`); if (r.status < 500) break; } catch { await new Promise((r) => setTimeout(r, 100)); }
  }
  return { stop: () => proc.kill() };
}
export async function launch() {
  return chromium.launch({ args: ["--no-sandbox"] });
}
