# Montes Abogados Asociados — sitio web

Sitio institucional construido con **React + Vite** (JavaScript, HTML y CSS).
Cada página HTML de la raíz es una URL del sitio y monta su componente de React.

## Requisitos

- Node.js 18 o superior
- npm

## Instalar y correr

```bash
npm install
npm run dev        # desarrollo: http://localhost:5173/pagina-montes.html
npm run build      # genera la carpeta dist/ lista para subir al hosting
npm run preview    # revisa el build localmente
npm test           # pruebas automáticas
```

## Estructura

```
├── *.html                      Una página por archivo (entrada de Vite)
├── src/
│   ├── main.jsx                Monta el componente de cada página
│   ├── admin-main.jsx          Monta el panel de administración
│   ├── componentes/
│   │   ├── PaginaSitio.jsx     Página pública (menú, contenido, formulario, carrusel)
│   │   ├── PaginaPolitica.jsx  Política de tratamiento de datos
│   │   └── PanelAdmin.jsx      Panel del administrador
│   ├── legacy/
│   │   ├── sitio.js            Lógica del sitio (construcción del contenido y controles)
│   │   ├── admin.js            Lógica del panel
│   │   └── politica.js         Tema e idioma de la política
│   ├── paginas/                Marcado estático que se inserta con React
│   ├── styles/                 estilos.css (sitio) y admin.css (panel)
│   ├── __tests__/              Pruebas con Vitest + Testing Library
│   └── test/setup.js           Ajustes del entorno de pruebas
├── vite.config.js
└── package.json
```

## Contenido del sitio

El contenido (servicios, equipo, publicaciones, textos) está en `src/legacy/sitio.js` y se puede cambiar desde el **panel de administración** (`panel-administracion.html`).

## Persistencia de los cambios del panel

Hay dos lugares:

1. **Navegador del administrador** (`localStorage`, clave `datosMontesSitio`): al pulsar "Guardar cambios" se guarda aquí. Es una vista previa, solo se ve en ese navegador.
2. **Archivo `datos.json`**: al pulsar "Descargar datos.json" se genera el archivo. Hay que subirlo a la **misma carpeta del sitio** en el hosting, reemplazando el anterior. Es lo que ven todos los visitantes.

Al cargar, el sitio usa primero los datos del navegador y, si no hay, descarga `datos.json`.

**Flujo:** editar → Guardar cambios → Descargar datos.json → subir `datos.json` al hosting → revisar en modo incógnito.

## Carrusel de imágenes

Se administra en el panel ("Carrusel de imágenes"). Cada diapositiva tiene imagen (máximo 900 KB), título y texto en español e inglés, y un enlace opcional. Sin diapositivas con imagen, el carrusel no aparece.

## Formulario de contacto

Envía a `formsubmit.co/ajax/claudia@montes-a.com`, con asunto "Nueva consulta - Montes Abogados Asociados" y respuesta dirigida al correo del visitante.

Para que llegue el correo:
1. El sitio debe abrirse por `https://` (no con doble clic en el archivo).
2. La primera vez, FormSubmit envía un correo de **activación** a claudia@montes-a.com. Hay que confirmarlo.

## Idioma

Español e inglés. El botón de bandera cambia el idioma; las páginas dinámicas usan `<html lang>` y la política de datos usa su propio selector.

## Despliegue

`npm run build` genera `dist/`. Suba **el contenido de `dist/`** al hosting. El sitio usa rutas relativas (`base: "./"`), así que funciona en cualquier carpeta. Si el hosting busca `index.html`, renombre `pagina-montes.html` a `index.html` o agregue un `index.html` que redirija.

## Pendientes

- **Contraseña del panel:** está en el código (`src/legacy/admin.js`). No es seguridad real; conviene protegerlo en el servidor.
- **Correo de destino:** `SITIO.correo` es `lucy@montes-a.com` y el formulario envía a `claudia@montes-a.com`. Confirmar cuál debe recibir las consultas.
- **Imágenes del carrusel** se guardan dentro de `datos.json`. Con muchas imágenes conviene migrar a almacenamiento de archivos.
