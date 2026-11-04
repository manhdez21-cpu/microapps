# Microapps Factory

Fábrica de microaplicaciones (web/PWA primero, móvil después) financiada con anuncios + Premium. Propietario: Manuel.

**Retomar trabajo:** leer `CLAUDE.md` → `MEMORY.md` → `PROGRESS.md`. El prompt completo está en `PROMPT_MAESTRO.md`.

## Estado
| Área | Estado |
|---|---|
| Investigación de mercado (1.ª pasada) | Hecha, con limitaciones → `MARKET_RESEARCH.md` |
| Núcleo `@microapps/core` + `@microapps/ui` | Implementado y probado |
| SplitFlow, PriceRight, ¿Cuánto me sobra?, Control Center | Implementados y probados (unitario + E2E), sin desplegar |
| Caja Clara (UI), ExpiryHub, Warranty Keeper, Huella al Día | No implementado |
| BD/auth, anuncios, Premium, dominio, CI | No implementado / pendiente de credenciales |

## Comandos
```bash
node tools/build.mjs        # tsc → dist/
node tools/gen-status.mjs   # pruebas + datos del Control Center
node tests/e2e/splitflow.e2e.mjs
```
Sirve `dist/` con un servidor estático (`python3 -m http.server -d dist`).

## Documentos
`PROJECT_MASTER_PLAN` · `ARCHITECTURE` · `BUSINESS_MODEL` · `MARKET_RESEARCH` · `PRODUCT_ROADMAP` · `MONETIZATION_PLAN` · `SECURITY` · `DEPLOYMENT` · `ENVIRONMENT_SETUP` · `PROGRESS` · `DECISIONS` · `TEST_PLAN` · `COST_TRACKER` · `RELEASE_CHECKLIST` · `SKILLS`
