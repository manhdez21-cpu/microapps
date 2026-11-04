# TEST_PLAN

## Estado actual (2026-11-04)
`@microapps/core`: **42 pruebas, 42 pasan** (`node --test`), typecheck estricto limpio. Estado: **Probado** (unitario). No hay pruebas de integración, E2E ni de interfaz porque aún no existen.

| Módulo | Qué se verifica |
|---|---|
| money | half-up, bps, `allocate` suma exacta (2000 casos con semilla fija), negativos, pesos cero, entradas inválidas |
| splitflow | equitativo/%/exacto, saldos suman 0, liquidación exacta y ≤ n−1 pagos (500 escenarios aleatorios), gastos inconsistentes |
| priceright | 20 % margen = 25 % recargo, 50 % recargo = 33,33 % margen, comisión e impuesto, rechazo margen+comisión ≥ 100 % |
| materials | piezas, desperdicio, cajas, juntas, pintura, conversiones, ruido de float |
| cashclose | esperado vs contado, fiado no entra a caja, cobro de fiado sí, duplicados y montos inválidos |

## Limitaciones honestas
- Las pruebas son mías; falta revisión independiente (la auditará Claude Code).
- Las fórmulas de materiales dependen de rendimientos configurables del fabricante; no se verificaron contra productos reales.
- `settle` no garantiza el mínimo absoluto de transferencias (NP-difícil).

## Pendiente
- Pruebas de componentes y E2E (Playwright, disponible en el entorno) cuando haya UI.
- Pruebas de accesibilidad, rendimiento y de integración con Supabase/Stripe/ads (con credenciales de prueba).
- CI.
