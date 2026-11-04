# DEPLOYMENT

Estado: **no desplegado**. Sin cuentas de hosting.

## Plan
1. Repo en GitHub (privado) — requiere que Manuel lo autorice/cree o conecte.
2. Hosting web gratuito/bajo costo (Vercel, Cloudflare Pages u otro; verificar límites y términos vigentes — algunos planes gratuitos restringen uso comercial).
3. Un proyecto de hosting por app + uno para Control Center (acceso privado).
4. Variables de entorno por proyecto; sin secretos en el repo.
5. CI: pruebas + typecheck antes de cada despliegue.
6. Dominios: compra requiere autorización de Manuel (costo).
7. PWA primero; Android/iOS después (ver RELEASE_CHECKLIST.md).

## Entornos
`local` → `preview` (por rama) → `producción` (requiere autorización explícita de Manuel).
