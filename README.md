# Security Lab · Jon Ander

Blog en [Astro](https://astro.build) para documentar laboratorios de ciberseguridad
(CyberDefenders, Blue Team Labs Online, propios…) y guías técnicas.

## Arrancar en local

Necesitas **Node.js 22 o superior**.

```bash
npm install
npm run dev        # http://localhost:4321 (se ven también los borradores)
npm run build      # genera la web estática en dist/
npm run preview    # sirve dist/ para comprobar el build
```

## Añadir un laboratorio nuevo

1. Copia `src/content/recursos/_plantilla.md` y renómbralo, p. ej. `testa.md`
   (el nombre será la URL: `/recursos/testa/`).
2. Rellena el frontmatter (título, fecha, plataforma, categoría, dificultad, herramientas…).
3. Escribe el writeup en Markdown.
4. Mete las capturas en `public/images/recursos/testa/` y enlázalas así:
   `![Filtro NTLM en Wireshark](/images/recursos/testa/q1.png)`
5. Mientras lo redactas deja `draft: true`; cuando esté listo, ponlo a `false`.

Las estadísticas de la portada, los filtros, las categorías y el RSS se actualizan solos.

### Extras para el Markdown

- Respuestas ocultas (para no hacer spoiler):

  ```html
  <details>
  <summary>Ver respuesta</summary>

  `respuesta`

  </details>
  ```

- Cajas de aviso: `<div class="callout tip">`, `warn` o `info` (deja una línea en blanco
  después de abrir y antes de cerrar el `div`).
- Las citas (`> texto`) se muestran como notas destacadas.

## Estructura

```
src/
  config.ts              ← nombre, enlaces (LinkedIn/GitHub) y categorías
  content.config.ts      ← campos permitidos en el frontmatter
  content/recursos/      ← un .md por laboratorio o guía
  components/            ← cabecera, tarjetas, iconos…
  pages/                 ← inicio, recursos, categorías, sobre mí, RSS
  styles/                ← estilos globales y del contenido
public/                  ← favicon e imágenes
```

## Publicarlo

Antes de publicar, cambia `site` en `astro.config.mjs` por tu dominio y pon tu URL de LinkedIn
en `src/config.ts`.

La forma más sencilla: sube el proyecto a GitHub y conéctalo a **Netlify**, **Vercel** o
**Cloudflare Pages** (detectan Astro solos; comando `npm run build`, carpeta `dist`).
Cada `git push` vuelve a publicar la web.
