import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readdirSync, copyFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

// Una entrada HTML por página: cada archivo .html de la raíz es una URL del sitio.
// Los que terminan en "-cuerpo.html" no son páginas: son trozos de HTML que
// React inserta dentro de otras, así que se quedan fuera de esta lista.
const raiz = fileURLToPath(new URL(".", import.meta.url));
const paginas = Object.fromEntries(
  readdirSync(raiz)
    .filter((f) => f.endsWith(".html") && !f.endsWith("-cuerpo.html"))
    .map((f) => [f.replace(/\.html$/, ""), resolve(raiz, f)])
);

// datos.json vive en la raíz (así se reemplaza fácil desde el panel), pero el
// sitio lo pide en tiempo de ejecución: sin esta copia, en Netlify da 404 y el
// carrusel y las imágenes de las publicaciones no aparecen.
const copiarDatosJson = {
  name: "copiar-datos-json",
  closeBundle() {
    const origen = resolve(raiz, "datos.json");
    if (existsSync(origen)) copyFileSync(origen, resolve(raiz, "salida", "datos.json"));
  },
};

export default defineConfig({
  plugins: [react(), copiarDatosJson],
  base: "./",
  build: {
    outDir: "salida",
    rollupOptions: { input: paginas },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./setup.js"],
    include: ["*.test.{js,jsx,ts,tsx}"],
  },
});
