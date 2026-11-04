# Guía para Manuel: lo único que te toca hacer

Todo el código está terminado y probado (101 pruebas unitarias + 7 suites E2E). Lo que sigue necesita **tus cuentas, tu identidad o tu dinero**, y por eso no lo hice yo. Está en orden: cada paso desbloquea el siguiente. Los pasos 1–2 son gratis y ya dejan las 7 apps en internet.

## 1. Publicar la web (gratis, ~15 min)
1. Crea una cuenta en https://github.com y un repositorio **público** llamado `microapps` (vacío, sin README).
2. En tu carpeta `MicroApps` está el archivo `microapps.bundle` (es todo el historial de git). En una terminal, dentro de esa carpeta:
   ```
   git clone microapps.bundle microapps-repo
   cd microapps-repo
   git remote set-url origin https://github.com/TU_USUARIO/microapps.git
   git push -u origin HEAD:main
   ```
   (Usa la carpeta `microapps-repo` de ahora en adelante; ignora la carpeta `.git` vieja que quedó dentro de `MicroApps`, puedes borrarla.)
3. En GitHub: **Settings → Pages → Source: GitHub Actions**. En 2–3 minutos el workflow `Deploy` publica el sitio en `https://TU_USUARIO.github.io/microapps/`.
4. Abre el sitio, prueba cada app desde el celular y usa «Instalar» / «Añadir a pantalla de inicio».

Dime la URL cuando la tengas y yo hago la verificación final.

## 2. Dominio propio (~USD 10–15 al año, único gasto casi obligatorio)
Lo necesitas para AdSense y Search Console. Cómpralo en Cloudflare o Namecheap, y en GitHub **Settings → Pages → Custom domain**. Cuando me digas el dominio, yo añado `canonical`, `sitemap.xml`, `robots.txt` y `ads.txt` y actualizo el JSON-LD.

## 3. Anuncios web con Google AdSense
1. Entra a https://adsense.google.com con tu cuenta de Google, añade tu dominio y enlaza el sitio.
2. Antes de pedir revisión, completa en `site/privacidad.html` el **correo de contacto** (hoy dice «pendiente»).
3. Google revisa el sitio (de días a semanas). Riesgo real: puede rechazarlo por «poco contenido». Si pasa, dímelo y amplío cada página con guías y artículos útiles.
4. Al aprobarte, crea una unidad de anuncio y copia **dos valores públicos** (no son secretos): `ca-pub-…` y el número de la unidad. Pégalos en `site/site-config.js` (`adsenseClient` y `adSlot`) y haz push. También sube un `ads.txt` con la línea que te indica AdSense.
5. Los anuncios solo cargan si el visitante acepta el aviso de consentimiento. **Para visitantes de la Unión Europea, Reino Unido y Suiza Google exige un aviso de consentimiento certificado**; el mío es simple. Si vas a recibir tráfico de allí, activa «Privacidad y mensajes» en AdSense. Si tu público es latinoamericano, no es urgente.

Ingresos: no hay ninguna cifra prometida. Dependen del tráfico, que hoy es cero. Primero hace falta que Google indexe las calculadoras (Search Console: verifica el dominio y envía el sitemap).

## 4. Premium (hoy NO funciona; no lo actives aún)
Existe solo el enlace «Quitar anuncios con Premium» si pones `premiumUrl`. No hay cuentas ni verificación de pago, así que cobrar hoy no quitaría los anuncios. Recomendación: espera a tener tráfico. Cuando quieras, necesitas cuenta Stripe verificada y un proyecto Supabase; me das las claves **como variables de entorno del hosting**, nunca por el chat.

## 5. Android en Google Play y iPhone desde la web
**iPhone/iPad (ya listo, sin tienda):** cada app muestra al pie «Instalar en tu celular» y la portada enlaza `instalar.html`, con los pasos de Safari (Compartir → Añadir a pantalla de inicio). Así quien no te encuentre en la tienda la instala desde la web. No necesitas cuenta de Apple.
**Android:** por ahora también funciona desde Chrome con el mismo botón. Para Google Play:
1. Cuenta de desarrollador: pago único de USD 25 y verificación de identidad.
2. Empaqueta cada app (o la portada) en https://www.pwabuilder.com pegando la URL del sitio publicado; descarga el paquete de Android que te da.
3. Sube el paquete en Play Console. Cuentas personales nuevas deben tener 12 testers durante 14 días antes de pasar a producción (verifica la regla vigente).
4. Cuando Play te dé la URL de la ficha, pégala en `playUrl` de `site/site-config.js`: aparece el botón «Descargar desde Google Play» en `instalar.html`.
Importante: **AdSense no se permite dentro de apps**; para anuncios en la app haría falta AdMob y reconstruir con Capacitor (puedo hacerlo cuando decidas). App Store: USD 99/año y un Mac; no lo necesitas gracias a la instalación web.

## Qué NO hice y por qué
- No creé cuentas, no pagué nada y no conecté AdSense, Stripe ni Supabase: son tuyos.
- No hay analítica de usuarios; el panel (`apps/control-center`, no se publica) muestra solo datos reales o «pendiente».
- Datos en la nube: las apps guardan solo en el navegador de cada persona.
- OCR (leer facturas o documentos desde la foto) no está implementado en Warranty Keeper ni ExpiryHub: hoy se adjunta la foto y se escriben los datos a mano.
- Huella al Día no da dosis ni consejos veterinarios; solo registra lo que anota la persona.
- Asegúrate de revisar la política de privacidad: es una plantilla, no asesoría legal.

## Costos actuales
USD 0. Gastos futuros posibles: dominio (~USD 10–15/año), Google Play (USD 25 una vez), Apple (USD 99/año). Ver `COST_TRACKER.md`.
