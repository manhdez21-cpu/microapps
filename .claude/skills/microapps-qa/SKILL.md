---
name: microapps-qa
description: Verificar una microapp del proyecto Microapps antes de darla por terminada o desplegarla (pruebas, build, E2E, desborde móvil, modo oscuro, consola limpia).
---
# QA de Microapps
1. `node tools/check-all.mjs` (build + tipos + unitarias + todas las E2E). Debe terminar con TODO OK.
2. Si añades una app: pruebas unitarias en `apps/<app>/test/*.test.ts`, una suite E2E en `tests/e2e/` y registro en `apps/control-center/data/registry.json`.
3. La E2E cubre: flujo principal, entrada inválida, persistencia al recargar, datos corruptos en localStorage, sin desborde horizontal a 390 px, modo oscuro, JSON-LD válido y consola sin errores.
4. Mira al menos una captura móvil y una oscura (`SHOTS=/ruta`) antes de cerrar.
5. Estado en el panel: "probado" = pruebas pasan aquí; "verificado" solo con evidencia en producción.
Reglas: dinero en enteros (unidad menor); no inventar cifras; sin npm (bloqueado): usar `node --test` y el shim `expect`.
