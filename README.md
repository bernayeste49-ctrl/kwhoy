# kWhoy — precio de la luz por horas

Web estática (Astro) con el precio del PVPC hora a hora, el precio de mañana, un histórico diario y una calculadora de coste por electrodoméstico. Datos: API pública de Red Eléctrica (apidatos.ree.es).

## Cómo funciona

- `src/data/prices.json` guarda el histórico (€/MWh por hora y día).
- `scripts/update-prices.mjs` descarga ayer, hoy y mañana de REE y lo añade al histórico.
- `.github/workflows/deploy.yml` ejecuta ese script varias veces al día (tras la publicación de REE ~20:15 y al cambiar de día), guarda el histórico en el repositorio, construye la web y la publica en GitHub Pages.
- Cada día nuevo genera su página automáticamente: `/precio-luz/AAAA-MM-DD/`.

## Desarrollo local

```bash
npm install
npm run update-prices   # opcional: trae los últimos precios
npm run dev             # http://localhost:4321
npm run build           # genera dist/
```

## Publicar (GitHub Pages + dominio kwhoy.es)

1. Crea un repositorio en GitHub (por ejemplo `kwhoy`) y sube este proyecto a la rama `main`.
2. En el repositorio: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. **Settings → Actions → General → Workflow permissions: Read and write**.
4. La primera ejecución arranca sola al subir el código (o desde **Actions → Run workflow**).
5. Mientras no haya dominio, la web se ve en `https://TU_USUARIO.github.io/kwhoy/`.
6. Dominio: crea la variable de Actions `CUSTOM_DOMAIN` = `kwhoy.es` (Settings → Secrets and variables → Actions → Variables) y, en **Settings → Pages → Custom domain** escribe `kwhoy.es` y activa **Enforce HTTPS** cuando esté disponible.
7. En DonDominio, zona DNS de kwhoy.es:
   - 4 registros **A** para `@`: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - 1 registro **CNAME** para `www` → `TU_USUARIO.github.io`

## Activar AdSense (cuando te aprueben)

1. En GitHub: **Settings → Secrets and variables → Actions → Variables**, crea:
   - `PUBLIC_ADSENSE_CLIENT` = `ca-pub-XXXXXXXXXXXXXXXX`
   - `PUBLIC_AD_SLOT_HOME` y `PUBLIC_AD_SLOT_CALC` = IDs de los bloques de anuncio
2. Edita `public/ads.txt` con tu ID de editor.
3. Antes de mostrar anuncios a usuarios de la UE, activa en AdSense el **mensaje de consentimiento** (Privacidad y mensajes → GDPR). Es la CMP certificada de Google y no requiere código extra.

## Pendiente antes de pedir AdSense

- Crear el correo `hola@kwhoy.es` (o cambiarlo en contacto, aviso legal y privacidad).
- Revisar los festivos nacionales de cada año en `src/lib/prices.js`.
