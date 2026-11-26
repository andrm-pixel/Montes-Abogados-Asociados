# Agente de IA del panel (todo en código)

No usa n8n ni herramientas externas de automatización. Son dos funciones de
Supabase (Deno) que llaman a OpenRouter con una sola petición y devuelven el resultado.

- `functions/agente-ia/`: chat del panel de administración.
- `functions/generar-prompt-video/`: guion y prompts de video por escenas, partidos en bloques de 15 s
  (parte 1 y sus continuaciones) para Dreamina/HeyGen. Guarda cada video como propuesta pendiente.
- `functions/_shared/video.ts`: lógica pura compartida (duración, cantidad de videos, reparto de servicios,
  partición en 15 s, limpieza del cierre). La usan la función y el chat; se prueba con `npm test`.

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

## Flujo interactivo del prompt de video

1. Escribe el tema (o pulsa **🎬 Generar prompt** y respóndelo). Solo se pide el tema: el video sale de 60 s por defecto, por escenas con tiempos, visual, voz en off y texto en pantalla, más el prompt para la herramienta de video y el texto para redes. Queda guardado en Pendientes de aprobación.
2. El chat pregunta qué quieres corregir o adaptar. Escribe el ajuste (por ejemplo "cambia el tono
   a más formal" o "la escena 2 que hable de liquidación") y pulsa **Enviar**.
3. La función recibe el borrador anterior y tu corrección, y devuelve la versión corregida.
   El cierre es fijo y no lleva dirección web (ver «Video completo»).
4. Para un tema nuevo, usa de nuevo **🎬 Generar prompt**.

## Por qué no se usa un framework de agentes

Los manuales de referencia (agentes con CrewAI, LangChain o ciclos de herramientas) se atascaban con
modelos gratuitos. Lo que funcionó fue una sola llamada con una plantilla fija. Por eso el flujo es
lineal: una petición por cada prompt o corrección, sin herramientas ni bucles.

## Si el chat muestra "HTTP 404"

- Vuelve a publicar `agente-ia` con el comando del paso 3. La versión anterior seguía mandando el
  nombre de modelo de Pollinations (`openai`), que OpenRouter no reconoce.
- Revisa que `OPENROUTER_MODEL` sea `openrouter/free`.


## Video completo (versión 3)

Solo hay que dar el tema; el resto se entiende del texto:

| Escribes | El agente hace |
|---|---|
| `liquidación de prestaciones` | 1 video de 60 s = 4 prompts de 15 s |
| `un video de 30 s sobre recaudo` | 1 video de 30 s = 2 prompts |
| `2 videos de 1 minuto presentando cada uno de nuestros servicios` | 2 videos distintos (enfoque diferente), cada uno de 4 prompts; la voz en off nombra los 7 servicios repartidos entre las partes |

- Duración válida: múltiplos de 15 s hasta 120 s. Máximo 3 videos por pedido.
- En el chat sale un mensaje por parte: «ESTE ES EL PROMPT DEL VIDEO 1 — PARTE 1 de 4» y luego
  «ESTA ES LA CONTINUACIÓN DEL VIDEO 1 — PARTE 2 de 4», etc. Cada parte se copia sola en la herramienta de video.
- El cierre es fijo y ya no lleva dirección web: la voz dice la frase de asesoría preventiva y en pantalla se lee
  «Visite ABOGADOS COLOMBIA - Montes Abogados Asociados S.A.S. o escríbanos al WhatsApp +57 300 725 7266».
- Ajustes: escribe «video 2: más formal» (con varios videos hay que decir cuál) o «hazlo de 30 segundos».
  Las peticiones de funciones nuevas no van en la caja de ajustes: son cambios de código.
- Si el modelo gratuito no escribe bien las partes, el servidor las arma con las escenas del guion.
- Tras actualizar el código hay que volver a publicar: `supabase functions deploy generar-prompt-video --no-verify-jwt`.

## Autores

Andrea Carolina Merlano Paternina – 20252020064 · Juan Felipe Gallego Chaves – 20251020016 · Roger Steward Arenales Sanabria – 20251020056
