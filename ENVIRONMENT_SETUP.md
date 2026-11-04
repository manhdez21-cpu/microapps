# ENVIRONMENT_SETUP

Verificado el 2026-11-04.

## Equipo de Manuel (leído con `get_device_info`)
- Windows (win32 x64), equipo `laptop-mlcjbk6g`, Claude Desktop 4.16336.0 (Electron 44.9.3, Node embebido 24.22.0).
- Carpetas de usuario visibles incluyen `.vscode`, `.codex`, `.copilot`, `.ollama`, `anaconda3`, `miniconda3`, Jupyter.
- **Ninguna carpeta conectada a la sesión**; no se pudo inspeccionar Git/Node/Claude Code instalados en Windows.
- Para trabajar en local: conectar una carpeta de proyecto (menú "+" → "Añadir carpeta" en Claude Desktop).

## Espacio de trabajo en la nube (donde está ahora el proyecto)
| Herramienta | Versión |
|---|---|
| Node | 22.23.4 |
| npm / pnpm | 10.9.9 / 10.28.0 |
| Git | 2.43.0 |
| Python | 3.13.18 |
| TypeScript global (`tsc`) | 7.0.2 |

## Máquina virtual del equipo (carpeta conectada)
Linux con Node 22.23, git 2.34, `tsc`; sin pnpm. Carpeta: `C:\Users\MALAU\OneDrive\Desktop\MicroApps` (montada en `$HOME/mnt/MicroApps`). Borrar archivos requiere permiso explícito (git deja `.lock`).

## Bloqueo conocido
`registry.npmjs.org` responde **403 de política** en la nube y en el VM del equipo: no se pueden instalar paquetes npm. No reintentar ni rodear. Consecuencias: sin frameworks (D-009), sin vitest/axe/Lighthouse. Playwright y Chromium sí existen en la nube.

## Comandos
```bash
node tools/build.mjs
node tools/gen-status.mjs
tsc -p tsconfig.web.json --noEmit
node tests/e2e/splitflow.e2e.mjs   # y control-center / calculators
```

## Ejecutar pruebas
```bash
cd packages/core
node --test test/*.test.ts
tsc -p tsconfig.json
```
