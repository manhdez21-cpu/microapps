# Guía para Manuel: lo único que te toca hacer

Todo el código está terminado y probado (ver PROGRESS.md para las cifras). Lo que sigue necesita **tus cuentas, tu identidad o tu dinero**, y por eso no lo hice yo. Está en orden: cada paso desbloquea el siguiente. Los pasos 1–2 son gratis y ya dejan las 7 apps en internet.

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

## 2. Dominio propio (opcional al inicio, ~USD 10–15 al año)
Las apps son **100 % gratuitas**; la única fuente de ingresos es la publicidad. AdSense suele exigir un dominio propio: en un `*.github.io` normalmente no aprueba. Cómpralo en Cloudflare o Namecheap y en GitHub **Settings → Pages → Custom domain**. Después crea la variable `SITE_URL` (paso 3).

## 3. Variables públicas del repositorio (no son secretos)
En GitHub: **Settings → Secrets and variables → Actions → Variables**. Cada una activa una función; vacía = inactiva. El workflow las pone en la web al desplegar (genera sitemap, robots, ads.txt y la configuración):
| Variable | Qué es | Cuándo |
|---|---|---|
| `SITE_URL` | Tu dominio, p. ej. `https://tudominio.com` | Si usas dominio propio (si no, se deduce la URL de GitHub Pages) |
| `GA4_ID` | ID de medición `G-XXXXXXXXXX` de Google Analytics 4 | Paso 4 |
| `ADSENSE_CLIENT` | `ca-pub-…` | Cuando AdSense te apruebe |
| `ADSENSE_SLOT` | Número de la unidad de anuncio (bajo la herramienta) | Idem |
| `ADSENSE_SLOT_INLINE` | Opcional: segunda unidad (final del texto). Si falta, usa la primera | Idem |
| `PLAY_URL` | Ficha de Google Play | Paso 6 |
Nota: `robots.txt`, `ads.txt` y `sitemap.xml` solo cuentan si están en la **raíz del dominio**; con un dominio propio lo están, con `usuario.github.io/microapps/` no.

## 4. Google Analytics 4 y Search Console (gratis)
1. https://analytics.google.com → crea una propiedad web y copia el ID `G-…` a la variable `GA4_ID`. Ya está probado que solo se carga si el visitante acepta y que no envía lo que escribe.
2. https://search.google.com/search-console → añade tu dominio, verifica la propiedad (te da un registro DNS) y envía `https://TU_DOMINIO/sitemap.xml`.
3. Para ver las cifras **en tu panel**: en Google Cloud crea una cuenta de servicio (gratis), dale rol Lector en la propiedad de GA4 y guarda su JSON en tu PC. Luego `GA4_PROPERTY_ID=… GOOGLE_APPLICATION_CREDENTIALS=ruta.json node tools/fetch-metrics.mjs` escribe `metrics.json` y el panel muestra visitas, usuarios, los que regresan e ingresos. El JSON no se sube a ningún lado ni me lo pases por el chat.
4. En AdSense, vincula la cuenta a GA4 (Administrador → Vínculos) para que los ingresos aparezcan en el panel.

## 5. Anuncios web con Google AdSense
1. https://adsense.google.com con tu cuenta de Google; añade tu dominio.
2. Antes de pedir revisión, escribe el **correo de contacto** en `site/privacidad.html` (hoy dice «pendiente»).
3. Google revisa el sitio (días a semanas). Riesgo real: rechazo por «poco contenido». Ya hay 4 guías, FAQ en cada app y enlaces internos; si lo rechaza, amplío con más guías.
4. Al aprobarte, crea la unidad de anuncio y pon `ADSENSE_CLIENT` y `ADSENSE_SLOT` (y opcional `ADSENSE_SLOT_INLINE`).
5. Cómo se ven: el anuncio espera a que la persona use la app (o 12 s), solo se carga si acepta, hay máximo 2 por página (1 en la app instalada), nunca ventanas ni anuncios pegados al borde.
6. Para visitantes de la UE/Reino Unido/Suiza Google exige un aviso certificado; el mío es simple. Si tu público es latinoamericano no es urgente; si no, activa «Privacidad y mensajes» en AdSense.

Ingresos: no hay ninguna cifra prometida. Dependen del tráfico, que hoy es cero.

## 6. Android e iPhone
**iPhone/iPad (listo, sin tienda):** botón «Instalar en tu celular» en cada app y `instalar.html` con los pasos. Los anuncios van por la web (AdSense). Sin cuenta de Apple.
**Android:** funciona desde Chrome con el mismo botón (con AdSense web). Para Google Play: cuenta de desarrollador (USD 25 una vez), empaquetar con https://www.pwabuilder.com, 12 testers durante 14 días (verifica la regla vigente); pega la URL en `PLAY_URL`.
**AdMob: no implementado.** Exige una app nativa (Capacitor/Kotlin) y aquí npm está bloqueado; además AdSense no se permite en apps nativas ni WebView. Una PWA empaquetada como TWA muestra la web en Chrome, pero **confirma con AdSense que lo permite** antes de depender de ello. Si quieres AdMob, hay que reconstruir un contenedor nativo: dímelo y lo evalúo cuando tenga acceso a npm.

## Qué NO hice y por qué
- No creé cuentas, no pagué nada y no conecté AdSense, Analytics ni Search Console: son tuyos.
- Sin credenciales, el panel (`apps/control-center`, no se publica) muestra «Sin datos» en visitas, usuarios e ingresos.
- No hay Premium, suscripciones ni compras: decisión definitiva.
- Datos en la nube: las apps guardan solo en el navegador de cada persona.
- OCR (leer facturas o documentos desde la foto) no está implementado en Warranty Keeper ni ExpiryHub: hoy se adjunta la foto y se escriben los datos a mano.
- Huella al Día no da dosis ni consejos veterinarios; solo registra lo que anota la persona.
- Asegúrate de revisar la política de privacidad: es una plantilla, no asesoría legal.

## Costos actuales
USD 0. Gastos futuros posibles: dominio (~USD 10–15/año) y Google Play (USD 25 una vez). Apple no hace falta. Ver `COST_TRACKER.md`.
