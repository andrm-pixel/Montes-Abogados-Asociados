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
const URL_SUPABASE = String(env.VITE_SUPABASE_URL || "").trim();
const CLAVE_PUBLICA = String(env.VITE_SUPABASE_ANON_KEY || "").trim();

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
