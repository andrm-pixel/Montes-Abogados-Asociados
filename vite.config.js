import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readdirSync } from "node:fs";
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

export default defineConfig({
  plugins: [react()],
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
