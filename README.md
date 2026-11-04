# Microapps Factory

Fábrica de microaplicaciones (web/PWA primero, móvil después) financiada con anuncios + Premium. Propietario: Manuel.

**Retomar trabajo:** leer `CLAUDE.md` → `MEMORY.md` → `PROGRESS.md`. El prompt completo está en `PROMPT_MAESTRO.md`.

## Estado
| Área | Estado |
|---|---|
| Investigación de mercado (1.ª pasada) | Hecha, con limitaciones → `MARKET_RESEARCH.md` |
| Arquitectura | Diseñada → `ARCHITECTURE.md`, `DECISIONS.md` |
| Núcleo de cálculo `@microapps/core` | **Implementado y probado** (42 pruebas) |
| Dashboard, apps, anuncios, pagos | No implementado |

## Comandos
```bash
cd packages/core
node --test test/*.test.ts     # pruebas (Node ≥ 22, sin dependencias)
tsc -p tsconfig.json           # typecheck (requiere TypeScript)
```

## Documentos
`PROJECT_MASTER_PLAN` · `ARCHITECTURE` · `BUSINESS_MODEL` · `MARKET_RESEARCH` · `PRODUCT_ROADMAP` · `MONETIZATION_PLAN` · `SECURITY` · `DEPLOYMENT` · `ENVIRONMENT_SETUP` · `PROGRESS` · `DECISIONS` · `TEST_PLAN` · `COST_TRACKER` · `RELEASE_CHECKLIST` · `SKILLS`
