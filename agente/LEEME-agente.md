# Agente de IA para Montes Abogados — Flujo de trabajo (n8n + Gemini)

Este es el mismo patrón de la foto: **n8n es el cerebro**, Gemini hace el texto
y D-ID convierte el guion en video. Todo gratis o de prueba.

## El flujo (igual que la imagen)

```
┌─────────────────────┐
│ Cuando llega un      │   El chat: usted escribe "hazme un video sobre..."
│ mensaje (Chat)       │
└──────────┬──────────┘
           ▼
┌─────────────────────┐     ¿el mensaje trae la palabra "video"?
│ ¿Pide video? (IF)    │────────────────────────────┐
└──────────┬──────────┘                             │
      NO   │                                   SÍ   │
           ▼                                        ▼
┌─────────────────────┐                ┌─────────────────────┐
│ Agente: responde    │                │ Agente: escribe el  │
│ en texto            │                │ guion (30-45 seg)   │
└──────────┬──────────┘                └──────────┬──────────┘
           │                                      ▼
           │                           ┌─────────────────────┐
           │                           │ D-ID: crea el video │  (POST /talks)
           │                           └──────────┬──────────┘
           │                                      ▼
           │                           ┌─────────────────────┐
           │                           │ Espera 45 segundos  │
           │                           └──────────┬──────────┘
           │                                      ▼
           │                           ┌─────────────────────┐
           │                           │ D-ID: trae el video │  (GET /talks/{id})
           │                           └──────────┬──────────┘
           │                                      ▼
           │                           ┌─────────────────────┐
           │                           │ Agregar salida      │  → URL del MP4
           │                           └─────────────────────┘
           ▼
      La respuesta vuelve al chat
```

Dos nodos comparten lo mismo (esto es lo que se ve en la foto):

- **Google Gemini** → conecta a los dos agentes (el cerebro que responde)
- **Memoria de la charla** → recuerda lo que se habló antes

## Qué necesita para que funcione

| # | Dónde se consigue | Qué saca | Costo |
|---|---|---|---|
| 1 | https://aistudio.google.com/apikey | Clave de **Gemini** (pégala en el nodo "Google Gemini") | Gratis |
| 2 | https://studio.d-id.com → API Keys | Clave de **D-ID** (pégala como credencial Header Auth: nombre `Authorization`, valor `Bearer SU_CLAVE`) | Trial: 5 videos gratis |
| 3 | Una foto suya o de un abogado (URL pública) | El "avatar" que habla en el video | — |

**Solo la clave de Gemini es obligatoria.** Sin D-ID el flujo igual responde
textos (posts, carrusels, newsletters); solo la rama del video queda esperando.

## Cómo se usa (una vez instalado n8n)

1. Consiga la clave de Gemini (paso 1 de la tabla) y créela en n8n:
   **Credentials → New → Google Gemini → pega la clave**.
2. Abra el flujo `flujo-n8n-maa.json`: en n8n, **Workflows → Import from File**.
3. Entre al nodo "Google Gemini" y elija su credencial. Entre a los dos
   nodos "D-ID" y cree la credencial Header Auth con su clave de D-ID.
4. En "D-ID: crea el video" reemplace `PEGA_AQUI_LA_URL_DE_TU_FOTO` por la
   URL de la foto del avatar.
5. **Activate** (arriba) y hable por el chat del flujo.

## Próximos pasos (cuando quiera automatizar más)

- **Instagram Graph API** (gratis con cuenta Business): publica el carrusel
  solo. Se conecta como otro nodo HTTP al final de la rama de texto.
- **Groq** (gratis): alternativa a Gemini para escribir el guion, más rápido.
- **Fase 2 y 3 del plan original**: publicación automática en redes.

## Archivos

- `flujo-n8n-maa.json` — el flujo para importar en n8n
- `ia.html` — el chat con IA gratis que ya funciona sin instalar nada
- `LEEME-agente.md` — este documento
