# Agente de IA del panel (todo en código)

No usa n8n ni herramientas externas de automatización. Son dos funciones de
Supabase (Deno) que llaman a OpenRouter con una sola petición y devuelven el resultado.

- `functions/agente-ia/`: chat del panel de administración.
- `functions/generar-prompt-video/`: prompt de video (30 s, 3 escenas) para Dreamina/HeyGen.
  Guarda el resultado como propuesta pendiente de aprobación.

## Puesta en marcha (una sola vez)

1. Crea una clave gratuita en https://openrouter.ai (Keys).
2. Desde la carpeta raíz del proyecto (con la CLI de Supabase):

   supabase login
   supabase link --project-ref rhqtldpiuasrwcwaqrtl
   supabase secrets set OPENROUTER_API_KEY=sk-or-TU_CLAVE
   supabase secrets set OPENROUTER_MODEL=openrouter/free
   supabase functions deploy agente-ia --no-verify-jwt
   supabase functions deploy generar-prompt-video --no-verify-jwt

3. En Cloudflare Pages → Settings → Environment variables:

   VITE_IA_URL          = https://rhqtldpiuasrwcwaqrtl.supabase.co/functions/v1/agente-ia
   VITE_N8N_WEBHOOK_URL = https://rhqtldpiuasrwcwaqrtl.supabase.co/functions/v1/generar-prompt-video

   (El nombre VITE_N8N_WEBHOOK_URL se conserva por compatibilidad; apunta a la función de Supabase.)
   Luego vuelve a publicar el sitio (Retry deployment).

## Prueba

- Chat: escribe un mensaje en el panel; debe responder.
- Video: escribe un tema y pulsa "Generar prompt"; debe aparecer el prompt, el guion y el texto
  para redes, y quedar en "Pendientes de aprobación".

## Errores comunes

- 401 de OpenRouter: la clave está mal o falta el paso 2.
- 404 o "model not found": cambia OPENROUTER_MODEL por otro modelo de openrouter.ai/models.
- "Faltan secretos del servidor": falta el paso 2.
- "La IA no devolvió JSON válido": pulsa de nuevo; los modelos gratuitos a veces fallan.
