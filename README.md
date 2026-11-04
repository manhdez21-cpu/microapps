# Microapps Factory

Fábrica de microaplicaciones (web/PWA primero, móvil después) financiada con anuncios + Premium. Propietario: Manuel.

**Retomar trabajo:** leer `CLAUDE.md` → `MEMORY.md` → `PROGRESS.md`. El prompt completo está en `PROMPT_MAESTRO.md`.

## Estado
| Área | Estado |
|---|---|
| Núcleo `@microapps/core` + `@microapps/ui` | Implementado y probado |
| Las 7 apps web + Control Center + portada | Implementadas y probadas (unitario + E2E), sin desplegar |
| PWA instalable en las 7 | Implementado y probado (registro del service worker; offline sin probar) |
| Anuncios con consentimiento | Implementado, inactivo hasta tener ids de AdSense |
| Instalación en iPhone (Safari) y Android (Chrome) con botón y página `instalar.html` | Implementada y probada con navegadores simulados; sin probar en dispositivo real |
| Premium, BD/auth, dominio, tiendas | Pendiente de credenciales (ver `GUIA_MANUEL.md`) |

## Comandos
```bash
node tools/build.mjs        # tsc → dist/
node tools/gen-status.mjs   # pruebas + datos del Control Center
node tools/check-all.mjs   # todo: build, tipos, unitarias y E2E
```
Sirve `dist/` con un servidor estático (`python3 -m http.server -d dist`).

## Documentos
`PROJECT_MASTER_PLAN` · `ARCHITECTURE` · `BUSINESS_MODEL` · `MARKET_RESEARCH` · `PRODUCT_ROADMAP` · `MONETIZATION_PLAN` · `SECURITY` · `DEPLOYMENT` · `ENVIRONMENT_SETUP` · `PROGRESS` · `DECISIONS` · `TEST_PLAN` · `COST_TRACKER` · `RELEASE_CHECKLIST` · `SKILLS`
