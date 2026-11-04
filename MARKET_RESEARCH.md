# MARKET_RESEARCH

Fecha: 2026-11-04. Estado: **Fase 1, primera pasada**. Etiquetas: **[HECHO]** verificado en la fuente · **[ESTIMACIÓN]** inferencia mía · **[HIPÓTESIS]** por validar.

## Limitaciones de esta pasada (importante)
- Sin acceso a Google Trends, Keyword Planner ni herramientas SEO de pago: **no hay cifras de volumen de búsqueda**. Pendiente: validar con Trends/Search Console cuando haya sitio y cuenta.
- La búsqueda web devolvió listados de apps, no reseñas completas. Las reseñas leídas son muestras pequeñas.
- No se encontraron cifras de eCPM por país verificables (RevenueFlex 2026 solo da tiers cualitativos). Pendiente: medir con AdMob real.
- Las puntuaciones de la matriz son **[ESTIMACIÓN]** razonada sobre evidencia parcial, no mediciones.

## Hechos verificados por fuente

| # | Hecho | Fuente | Fecha fuente |
|---|---|---|---|
| 1 | Splitwise limitó gastos gratis (reportes de 3–4 por día) y un enfriamiento de 10 s al añadir gasto; usuarios buscaron alternativas | https://www.itvoice.in/splitwise-has-introduced-restrictions-on-the-number-of-free-expenses-users-can-add | 2023-12-30 |
| 2 | Reseñas de Splitwise en Google Play (muestra de 30): quejas por límite gratuito y anuncios; NPS −27 (muestra pequeña, no concluyente) | https://kimola.com/reports/splitwise-feedback-analysis-unlock-user-sentiments-google-play-154450 | 2024-11-24 |
| 3 | Existen blogs/landing de decenas de "alternativas a Splitwise sin límite diario": mercado concurrido | https://getfinny.app/blog/best-splitwise-alternatives-2026 (resultado de búsqueda, no leído completo) | 2026 |
| 4 | R5 (Colombia) lanzó app gratuita con alertas de SOAT, tecnomecánica, pico y placa, licencia, seguro, impuestos | https://www.valoraanalitik.com/empresa-lanza-app-para-alertar-a-conductores-sobre-tramites-vehiculares/ | 2023-10-18 |
| 5 | "Mi Carro" (SAPCO, Colombia) controla SOAT, impuestos, recordatorios 30/15/1 días | https://www.xataka.com.co/vehiculos/mi-carro-la-app-perfecta-para-mantener-todo-lo-relacionado-con-tu-vehiculo-al-dia/amp | 2016-06-21 |
| 6 | Apps de cierre de caja: separan efectivo/tarjeta, esperado vs contado, retiros y fondo inicial, bitácora de auditoría; dolor: cierres en papel/Excel y ediciones sin rastro | https://appmaster.io/blog/cash-register-closeout-app | 2025-01-18 |
| 7 | Pelo (mascotas): gratis hasta 2 animales, sin anuncios, pagos únicos (sin suscripción), offline | https://play.google.com/store/apps/details?id=tomlab.pelo | act. 2026-10-18 |
| 8 | Warrantly (garantías): ~145 instalaciones (estimado AppGoblin), 0 reseñas, 100 % IAP, sin anuncios | https://appgoblin.info/apps/com.techbasi.warrantly | act. 2026-05-26 |
| 9 | Tile Calculator (iOS): 4.5/5 con 78 valoraciones; gratis con compras internas; incluye desperdicio y juntas | https://apps.apple.com/us/app/id1512725104 | 2026-11-04 |
| 10 | Cuentas personales de Google Play creadas después del 13-nov-2023 requieren prueba cerrada con ≥12 testers durante 14 días consecutivos antes de producción | https://support.google.com/googleplay/android-developer/answer/14151465 | 2026-11-04 |
| 11 | Existen muchas calculadoras web gratuitas de precios freelance y margen (competencia SEO fuerte) | resultados de búsqueda (miniwebtool.com, agiled.app, plutio.com, entre otros) | 2026 |
| 12 | AdMob/AdSense pagan menos por impresión en mercados emergentes (LatAm) que en Tier 1 — solo cualitativo | https://revenueflex.com/blog/app-ad-revenue-benchmarks-2026 | 2026-03-22 |

## Evaluación por app (matriz de 100 puntos) — [ESTIMACIÓN]

Demanda 25 · Utilidad 20 · Diferenciación 15 · Recurrencia 15 · Monetización 15 · Facilidad 10.

| App | Dem | Util | Dif | Rec | Mon | Fac | **Total** | Clase |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| Caja Clara | 18 | 18 | 11 | 13 | 12 | 6 | **78** | Experimentar y validar (cerca de prioridad alta) |
| ExpiryHub | 17 | 16 | 11 | 11 | 10 | 8 | **73** | Experimentar y validar |
| SplitFlow | 20 | 16 | 8 | 10 | 9 | 9 | **72** | Experimentar y validar |
| PriceRight | 15 | 15 | 9 | 8 | 9 | 8 | **64** | Reconsiderar antes de invertir |
| Warranty Keeper | 16 | 14 | 9 | 6 | 8 | 8 | **61** | Reconsiderar antes de invertir |
| Huella al Día | 16 | 14 | 6 | 9 | 8 | 7 | **60** | Reconsiderar antes de invertir |
| ¿Cuánto me sobra? | 15 | 15 | 7 | 5 | 8 | 9 | **59** | Reconsiderar antes de invertir |

Ninguna alcanza 80. Según el prompt no se descartan: se analizan riesgos.

## Lectura por app

- **Caja Clara**: dolor real documentado (hechos 6); diferenciador posible = español/LatAm, offline, ventas fiadas (típicas del comercio local), bitácora inmutable. Riesgo: precisión financiera y soporte; competidores POS completos. **Prioridad 1 de validación.**
- **ExpiryHub**: hay apps vehiculares colombianas (hechos 4, 5) pero centradas en vehículos; hueco posible en documentos/contratos/pólizas genéricos y multi-perfil. Riesgo: retención tras cargar los datos; OCR de fechas añade complejidad.
- **SplitFlow**: demanda alta y probada, pero saturada; la ventana es "sin límite diario y sin fricción". Riesgo: diferenciación débil. Útil como primera app por su baja dificultad y algoritmo propio testeable.
- **PriceRight**: más viable como **calculadora web con SEO** (margen vs recargo, es-ES/es-CO/en) que como app móvil; competencia web gratuita abundante.
- **Warranty Keeper**: competidores diminutos (hecho 8) sugieren poca tracción o mala visibilidad; recurrencia baja. Hipótesis: encaja mejor como módulo de ExpiryHub.
- **Huella al Día**: competidor gratis sin anuncios y con pagos únicos (hecho 7) presiona precio y modelo de anuncios; menos diferenciación.
- **¿Cuánto me sobra?**: mejor como páginas web SEO (AdSense) con calculadora; baja recurrencia → mal candidato a app móvil.

## Conclusiones accionables
1. **Web/PWA primero**: el requisito de 12 testers × 14 días (hecho 10) retrasa Android; publicar en web no tiene esa barrera.
2. Construir primero el **núcleo de cálculo compartido y probado** (reparto, caja, precios, materiales): es reutilizable en web y móvil y verificable.
3. Candidatas a lanzar primero: **SplitFlow** (rápida) y **Caja Clara** (mayor potencial), y **calculadoras SEO** (PriceRight/¿Cuánto me sobra?) como experimento de tráfico orgánico.
4. Considerar fusionar Warranty Keeper dentro de ExpiryHub (**[HIPÓTESIS]**, a decidir tras validar).
5. No se puede prometer ingreso publicitario relevante en LatAm: el eCPM es menor (hecho 12); la suscripción y precios regionales deben validarse.

## Pendientes de investigación
- Volúmenes de búsqueda (Trends/Search Console) en es y en.
- Reseñas negativas de competidores (Splitwise, apps de caja, calculadoras de baldosa) en Play Store/App Store.
- Precios regionales y disposición a pagar.
- Políticas vigentes de AdSense/AdMob/Stripe/Play Billing antes de integrar.
