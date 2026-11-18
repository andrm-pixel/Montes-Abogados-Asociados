# Montes Abogados Asociados — sitio web

Sitio institucional hecho con **React + Vite** (JavaScript, HTML y CSS).
Cada archivo `.html` de la raíz es una dirección del sitio y monta su componente de React.

---

## Requisitos

- Node.js 18 o superior
- npm

---

 Inicio  http://localhost:5173/pagina-montes.html |
 Panel de administración http://localhost:5173/panel-administracion.html |

`Ctrl + Shift + R`.

---

## Comandos

```bash
cmd /c "npm install"     # primera vez: instala lo necesario
cmd /c "npm run dev"     # desarrollo en vivo
cmd /c "npm test"        # pruebas automáticas
cmd /c "npm run build"   # genera la carpeta salida/ para subir al hosting
cmd /c "npm run preview" # revisa la compilación en local
```

---

## Cómo está organizado

Todo el código está **directamente en la raíz**, sin carpetas internas.
Solo existen 4 carpetas: `.git`, `.vscode`, `node_modules` y `salida`.

```
├── *.html                      14 páginas: una URL por archivo (entrada de Vite)
│   ├── pagina-montes.html      Inicio
│   ├── panel-administracion.html   Panel de administración
│   ├── politica-datos.html     Política de datos
│   ├── nosotros.html, areas.html, contacto.html, actualidad.html
│   └── area-*.html             Las 7 páginas de área de práctica
├── *-cuerpo.html               Trozos de HTML que React inserta (no son páginas)
│
├── main.jsx                    Monta el componente de cada página pública
├── admin-main.jsx              Monta el panel de administración
├── PaginaSitio.jsx             Componente React de la página pública
├── PaginaPolitica.jsx          Componente React de la política
├── PanelAdmin.jsx              Componente React del panel
│
├── sitio.js                    La lógica del sitio (construye todo el HTML)
├── admin.js                    La lógica del panel (editar, guardar, traducir)
├── politica.js                 Tema e idioma de la política
│
├── estilos.css                 Colores, tamaños y modo oscuro del sitio
├── admin.css                   Estilos del panel
│
├── datos.json                  Los datos publicados (lo que ven los visitantes)
├── vite.config.js              Configuración de Vite y de las pruebas
├── package.json
├── setup.js                    Ajuste previo de las pruebas
├── sitio.test.jsx              Pruebas de la página pública
├── panel.test.jsx              Pruebas del panel
└── salida/                     Lo que genera "npm run build" (se sube al hosting)
```

### Qué hace cada tecnología

| Tecnología | Dónde está | Qué hace |
|---|---|---|
| **HTML** | los `.html` de la raíz | el esqueleto: solo dice qué componente montar |
| **React** | `PaginaSitio.jsx`, `PaginaPolitica.jsx`, `PanelAdmin.jsx` | organiza y monta; pide el contenido a JavaScript |
| **JavaScript** | `sitio.js`, `admin.js`, `politica.js` | construye cada sección, el carrusel, el panel y las traducciones |
| **CSS** | `estilos.css`, `admin.css` | colores, tamaños y modo oscuro. No toca ningún texto |

---

## De dónde salen los textos

El contenido (servicios, equipo, publicaciones, textos, imágenes del carrusel)
está en **`datos.json`** y se puede cambiar desde el **panel de administración**
(`panel-administracion.html`, usuario `admin`).

Los textos fijos que no se editan desde el panel están en `sitio.js`.

---

## Dónde se guardan los cambios

Hay dos lugares:

1. **Navegador del administrador** (`localStorage`, clave `datosMontesSitio`):
   al pulsar **Guardar cambios** se guarda ahí. Es una vista previa y solo se ve
   en ese navegador.
2. **Archivo `datos.json`**: al pulsar **Descargar datos.json** se genera el archivo.
   Hay que subirlo a la **misma carpeta del sitio** en el hosting, reemplazando el
   anterior. Es lo que ven todos los visitantes.

**Regla de seguridad:** gana siempre **lo más nuevo**. El sitio compara la fecha
`fechaActualizacion` de cada uno; si el archivo publicado es más reciente que lo
que hay en el navegador, se usa el archivo. Así nunca se pierde un cambio por
tener una copia vieja guardada.

**Flujo:** editar → Guardar cambios → Descargar datos.json → subir `datos.json`
al hosting → revisar en modo incógnito.

---

## Carrusel de imágenes

Se administra en el panel, en la sección **"Carrusel de imágenes (página de inicio)"**.

- Cada diapositiva lleva imagen (JPG o PNG, menos de 900 KB), y opcionalmente
  título, subtítulo y enlace, en español y en inglés.
- **Todos los campos son opcionales.** Si deja el título, el subtítulo y el enlace
  vacíos, la imagen sale sola en el carrusel, sin recuadro de texto.
- Al escribir en español, la versión en inglés se completa sola (también puede
  escribirla a mano; si lo hace, ya no se toca).
- El botón de la imagen dice **"Cambiar imagen"**; el cuadrito del navegador
  queda oculto.
- Si no hay imágenes con diapositiva, el carrusel no aparece.

---

## Formulario de contacto

Envía a `formsubmit.co/ajax/claudia@montes-a.com`, con asunto
"Nueva consulta - Montes Abogados Asociados" y respuesta dirigida al correo
del visitante.

Para que llegue el correo:

1. El sitio debe abrirse por `https://`.
2. La primera vez, FormSubmit envía un correo de **activación** a
   claudia@montes-a.com. Hay que confirmarlo.

---

## Idioma y traducción automática

Español e inglés. El botón de bandera cambia el idioma.

El panel traduce solo: al terminar de escribir un texto en español y salir del
campo, lo manda a traducir (Google y, si falla, otro servicio gratuito) y guarda
el inglés en `datos.json`. Esa traducción se usa en la versión inglesa del sitio.

---

## Pruebas

```bash
cmd /c "npm test"
```

Cubren, entre otras cosas: que la diapositiva sin título salga **sin recuadro**,
que el botón del panel diga **"Cambiar imagen"**, que el carrusel no muestre
imágenes sin archivo y que la traducción automática se use en inglés.

---

## Cómo publicarlo

```bash
cmd /c "npm run build"
```

Eso genera la carpeta **`salida/`**. Suba **el contenido de `salida/`** al hosting.
El sitio usa rutas relativas (`base: "./"`), así que funciona en cualquier carpeta.
Si el hosting busca `index.html`, renombre `pagina-montes.html` a `index.html`
o agregue un `index.html` que redirija.

### Aparecer en Google

Subir el código a GitHub **no** lo pone en Google. Hacen falta dos pasos más:

1. Publicar el sitio con una dirección pública (por ejemplo **GitHub Pages**:
   *Settings → Pages → Branch: main → Save*).
2. Registrar esa dirección en **Google Search Console** y enviar un **sitemap**.

---

## Cómo pasarlo a otro equipo

- **Para seguir trabajando:** comprima la carpeta del proyecto **sin
  `node_modules/`** (es enorme y se regenera). En el otro equipo instale Node,
  abra la carpeta y ejecute `npm install` y luego `npm run dev`.
- **Solo para verlo:** ejecute `npm run build` aquí, comprima la carpeta
  **`salida/`** y ábrela en el otro equipo. No necesita instalar nada.

---

## Pendientes

- **Contraseña del panel:** está en el código (`admin.js`).
  No es seguridad real; conviene protegerla en el servidor.
- **Correo de destino:** `SITIO.correo` y el formulario envían a
  `claudia@montes-a.com`. Confirmar si este debe ser el correo que recibe
  las consultas.
- **Imágenes del carrusel** se guardan dentro de `datos.json`. Con muchas
  imágenes conviene migrar a archivos sueltos.