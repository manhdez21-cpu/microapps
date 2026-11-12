# Auditoría Pro (2026-11-12) — propuesta, pendiente de aprobación de Manuel

Estado: **nada de esto está enganchado todavía**. Las 4 apps siguen 100 % gratis. El núcleo está en `shared/pro/`.
Criterio: lo esencial de cada app sigue gratis; Pro = exportar, informes, compartir y límites. Quien ya tiene datos no los pierde (los límites solo frenan lo nuevo).
El respaldo local y en Google Drive se queda gratis en todas (es la seguridad de los datos y es código común a las 7 apps).

## SplitFlow (`apps/splitflow/src/main.ts`, estado en `localStorage["splitflow:v1"]`)
| Hoy gratis | Propuesta | Dónde se engancha |
|---|---|---|
| Grupos, personas, gastos (igual / % / monto), saldos, «quién paga a quién», registrar pagos, editar | Gratis | — |
| Grupos ilimitados | Pro (gratis: hasta 2 grupos; los ya creados se conservan) | `newGroupForm` (:127) |
| Totales por persona y categoría + resumen para WhatsApp | Pro | `totalsSection` (:441) |
| Exportar CSV | Pro | `groupActions` (:518, botón :535) |

## Caja Clara (`apps/caja-clara/src/main.ts`, `cajaclara.draft.v1` / `cajaclara.history.v1`)
| Hoy gratis | Propuesta | Dónde se engancha |
|---|---|---|
| Cierre del día, movimientos, conciliación, historial, reporte del día | Gratis | — |
| Reportes por semana y mes + gráfica de ventas | Pro | `reportSection` (:123), `salesChart` (:142) |
| Fiados por cliente | Pro | `creditSection` (:154) |
| Descargar CSV | Pro | `exportCsv` (:192, botón :187) |

## PriceRight (`apps/priceright/src/main.ts`, `priceright.quotes.v1`)
| Hoy gratis | Propuesta | Dónde se engancha |
|---|---|---|
| Calculadora de precio, margen e impuestos | Gratis | — |
| Tabla de escenarios de margen | Pro | `scenarioTable` (:62) |
| Cotizaciones guardadas y compartir/descargar | Pro (gratis: hasta 3 guardadas) | `quoteSection` (:72, guardar :86), `shareBox` (:96); tope actual 60 en `quotes.ts:25` |

## Huella al Día (`apps/huella-al-dia/src/main.ts`, `huella.v1`)
| Hoy gratis | Propuesta | Dónde se engancha |
|---|---|---|
| Carnet, registros (vacunas, peso, etc.), recordatorios, gráfica de peso, editar | Gratis | — |
| Más mascotas | Pro (gratis: hasta 2; hoy el tope es 5 en `state.ts:13` y `:21`; quien ya tenga más las conserva) | `addPet` (`state.ts:18`), `newPetForm` (:40) |
| Ficha para compartir | Pro | `fichaDialog` (:124) |
| Gastos por mes y por tipo | Pro | `spendSection` (:82) |
| CSV del historial | Pro | botón en `petPage` (:166) |

## Común a las 4
- **Sin anuncios en Pro**: `initMonetization` en `packages/ui/src/monetize.ts` (:98) — no cargar AdSense si `isPro(app)`.
- Arranque: `await initPro("<app>")` en cada `main.ts` antes de `render()`, y `onProChange(render)`.
- Cada función: `if (!requirePro({ feature: "Exportar CSV" })) return;`

## Cómo funciona la licencia
`CT1.<datos>.<firma>`: datos = `{ v, app, id del pedido, fecha }`; firma ECDSA P-256. La app trae solo la clave pública y verifica sin servidor ni conexión.
Límites honestos: la licencia no está atada a un dispositivo (se puede copiar a otro o compartir) y, al ser código en el navegador, alguien con conocimientos técnicos puede saltarse el bloqueo. No se puede revocar una licencia sin servidor.
