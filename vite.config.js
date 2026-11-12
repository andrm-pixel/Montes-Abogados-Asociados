import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

// Una entrada HTML por página: cada archivo .html de la raíz es una URL del sitio.
const raiz = fileURLToPath(new URL(".", import.meta.url));
const paginas = Object.fromEntries(
  readdirSync(raiz)
    .filter((f) => f.endsWith(".html"))
    .map((f) => [f.replace(/\.html$/, ""), resolve(raiz, f)])
);

export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    rollupOptions: { input: paginas },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.js"],
    include: ["src/**/*.test.{js,jsx}"],
  },
});
