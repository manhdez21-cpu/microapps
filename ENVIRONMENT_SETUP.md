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

## Bloqueo conocido
`registry.npmjs.org` responde **403 de política** desde esta sesión (DNS directo tampoco resuelve): **no se pueden instalar paquetes npm aquí**. Consecuencias:
- El núcleo no usa dependencias; pruebas con `node:test`.
- Next.js/Expo/Supabase SDK no se pueden instalar en esta sesión.
- Solución: ejecutar el desarrollo con dependencias en el equipo de Manuel (carpeta conectada) o en una sesión con acceso a npm. GitHub sí es accesible (se clonó `anthropics/skills`).

## Ejecutar pruebas
```bash
cd packages/core
node --test test/*.test.ts
tsc -p tsconfig.json
```
