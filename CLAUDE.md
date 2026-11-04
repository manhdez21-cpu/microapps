# MICROAPPS FACTORY — Instrucciones del proyecto

Lee esto al inicio de CADA sesión, en este orden:

1. `MEMORY.md` — memoria propia del proyecto (estado, decisiones, preferencias, pendientes).
2. `PROGRESS.md` — qué se hizo y cuál es la siguiente tarea.
3. `PROMPT_MAESTRO.md` — prompt completo del proyecto (fuente de verdad; NO pedirle a Manuel que lo repita).

## Reglas esenciales (resumen; detalle en PROMPT_MAESTRO.md)

- Hablar de "tú" con Manuel, respuestas breves y precisas, en español.
- Ejecutar de forma autónoma; consultar solo por credenciales, cuentas, pagos, publicación en producción, decisiones legales/financieras importantes o acciones irreversibles.
- Nunca pedir ni guardar secretos en el chat ni en el repositorio; usar variables de entorno.
- Eficiencia de tokens: sin explicaciones innecesarias, sin búsquedas duplicadas, modelo económico para tareas simples.
- No inventar datos, métricas ni integraciones. Diferenciar: Implementado / Probado / Verificado / Pendiente de credenciales / Pendiente de aprobación / No implementado.
- Costos mínimos: registrar todo en `COST_TRACKER.md`; no contratar nada sin autorización.
- Al cerrar cada sesión: actualizar `PROGRESS.md`, `DECISIONS.md` y `MEMORY.md`.

## Skills del proyecto (`.claude/skills/`)

Origen: https://github.com/anthropics/skills (commit ca45fc4, 2026-10-28). Ver `SKILLS.md`.

- Presentación: `pptx`
- Diseño: `frontend-design`, `canvas-design`, `theme-factory`, `brand-guidelines`, `web-artifacts-builder`, `algorithmic-art`
- Desarrollo/QA: `webapp-testing`, `mcp-builder`, `claude-api`
- Documentos/datos: `docx`, `pdf`, `xlsx`, `doc-coauthoring`
- Meta: `skill-creator`
