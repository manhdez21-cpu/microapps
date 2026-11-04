# ARCHITECTURE

Estado: **diseño + núcleo implementado**. Todo lo no listado como "Implementado" es propuesta.

## Estructura del repositorio

```
Microapps/
├─ packages/
│  ├─ core/            [IMPLEMENTADO+PROBADO] lógica pura: dinero, reparto, caja, precios, materiales
│  ├─ ui/              [propuesto] componentes y tokens de diseño compartidos
│  └─ config/          [propuesto] tsconfig/eslint compartidos
├─ apps/
│  ├─ control-center/  [propuesto, Fase 4] dashboard privado (Next.js)
│  ├─ splitflow/       [propuesto] PWA Next.js
│  ├─ caja-clara/      [propuesto]
│  └─ …                resto de microapps
├─ .claude/skills/     skills del proyecto
└─ docs: *.md          ver README
```

## Stack propuesto (ver DECISIONS.md)

| Capa | Elección | Por qué | Alternativa descartada por ahora |
|---|---|---|---|
| Lenguaje | TypeScript estricto | Un solo lenguaje web+móvil; tipos protegen cálculos | JS |
| Web/PWA | Next.js | SEO (SSR/SSG), páginas de aterrizaje y app en un solo framework | Vite SPA (peor SEO) |
| Móvil | Expo / React Native, **solo tras validar tracción** | Reutiliza `core` y lógica | Flutter (no reutiliza TS) |
| Datos | Local-first (IndexedDB/SQLite); Supabase para sync Premium | Costo cero y privacidad; sync solo cuando paga | Firebase |
| Auth | Supabase Auth (cuando haya cuenta) | RLS integrado | Auth propia |
| Hosting | Gratuito/bajo costo (a verificar límites vigentes) | Presupuesto mínimo | — |
| Pagos web | Stripe | Estándar | — |
| Pagos móvil | RevenueCat o facturación nativa | Centraliza estado Premium | — |
| Anuncios | AdSense (web), AdMob (móvil) | Pedido por el propietario | — |

Nada de lo "propuesto" está contratado ni creado: requiere cuentas de Manuel.

## Principios del núcleo (`@microapps/core`) — implementado

1. **Dinero en unidades menores enteras** (centavos). Nunca floats. Redondeo half-up explícito (`divRound`, `applyBps`).
2. **Reparto exacto** (`allocate`, método del mayor resto): la suma de las partes es igual al total; BigInt interno evita desbordes.
3. **Porcentajes en puntos básicos** (bps) enteros.
4. **Funciones puras sin I/O**: mismas entradas → mismas salidas; reutilizables en web y móvil.
5. **Validación estricta**: entradas inválidas lanzan `RangeError`; no se corrigen en silencio.
6. **Fórmulas visibles** en materiales para resultados verificables.
7. Imports con extensión `.ts` para ejecutar con Node sin bundler (ver D-007).

## Módulos del núcleo

| Módulo | App | Contenido |
|---|---|---|
| `money.ts` | todas | `divRound`, `applyBps`, `allocate` |
| `splitflow.ts` | SplitFlow | `splitEqual/ByPercent/Exact`, `computeBalances`, `settle` (voraz, ≤ n−1 pagos) |
| `cashclose.ts` | Caja Clara | `closeCashRegister` (esperado vs contado; fiado no entra a caja) |
| `priceright.ts` | PriceRight | margen vs recargo, `priceFromCosts` (comisión, impuesto configurable), `laborCost` |
| `materials.ts` | ¿Cuánto me sobra? | área/perímetro, `tilesNeeded` (juntas, desperdicio, cajas), `paintNeeded`, conversiones |

## Datos y privacidad (diseño)
- Datos del usuario en el dispositivo por defecto. Sync solo opt-in y Premium.
- Tablas con `user_id` y **RLS** activada; sin claves de servicio en el cliente.
- Eliminación de cuenta y datos como función de primera clase.
- Anuncios: consentimiento (CMP) antes de cargar scripts publicitarios; Premium no carga anuncios.

## Dashboard (Control Center) — diseño
- Fuentes de datos con estado por integración: `conectado | pendiente de credenciales | no implementado`.
- Cada métrica lleva su etiqueta de origen: **real**, **estimada** o **simulada**; nunca se mezclan en una misma cifra.
- Sin integración conectada, la tarjeta muestra "pendiente", no ceros inventados.
