/* =============================================================
   CONEXIÓN CON SUPABASE
   -------------------------------------------------------------
   Lee VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY (archivo .env en
   tu computador; variables de entorno en Netlify).

   Si faltan, "supabase" queda en null y hayBackend() da false: el
   sitio sigue funcionando como antes (datos.json + navegador) en
   vez de romperse. Así se puede publicar sin tener las claves.

   La clave que va aquí es la PÚBLICA (sb_publishable_... / anon).
   Nunca pongas aquí la sb_secret_... ni la service_role.
   ============================================================= */
import { createClient } from "@supabase/supabase-js";

const env = (import.meta && import.meta.env) || {};

/* Las pruebas corren sin conexión: vite.config.js deja las VITE_* vacías.
   En el sitio real, si falta el .env, se usan estos valores públicos para
   que Netlify funcione aunque no se hayan creado las variables en el panel. */
const EN_PRUEBAS = env.MODE === "test" || Boolean(env.VITEST);
const URL_POR_DEFECTO = "https://rhqtldpiuasrwcwaqrtl.supabase.co";
const CLAVE_POR_DEFECTO = "sb_publishable_HJf2hDmWFQ1mFjUv3cv7jQ_XM8i2ND_";

/* Acepta la URL con o sin "/rest/v1/" al final. */
function normalizarUrl(valor) {
  return String(valor || "")
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/rest\/v1$/, "")
    .replace(/\/+$/, "");
}

const URL_SUPABASE = normalizarUrl(
  env.VITE_SUPABASE_URL || (EN_PRUEBAS ? "" : URL_POR_DEFECTO)
);
const CLAVE_PUBLICA = String(
  env.VITE_SUPABASE_ANON_KEY || (EN_PRUEBAS ? "" : CLAVE_POR_DEFECTO)
).trim();

/* Se anota ANTES de crear el cliente (que limpia la URL): ¿se llegó desde
   el enlace de "restablecer contraseña"? */
export const LLEGO_POR_RECUPERACION =
  typeof window !== "undefined" && /[#&]type=recovery/.test(window.location.hash || "");

export function hayBackend() {
  return Boolean(URL_SUPABASE && CLAVE_PUBLICA);
}

export const supabase = hayBackend()
  ? createClient(URL_SUPABASE, CLAVE_PUBLICA, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        // "implicit": el enlace del correo funciona aunque se abra en
        // otro dispositivo o navegador (PKCE no lo permite).
        flowType: "implicit",
      },
    })
  : null;
