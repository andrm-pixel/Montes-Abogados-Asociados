// supabase/functions/agente-ia/index.ts
// Chat del panel. La clave de OpenRouter vive en el secreto OPENROUTER_API_KEY (nunca en el navegador).
// Recibe { model?, messages } y devuelve el formato de OpenAI que ya usa servicioIA.ts.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const MODELO = Deno.env.get("OPENROUTER_MODEL") || "openrouter/free";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return Response.json({ error: "Método no permitido" }, { status: 405, headers: CORS });

  const clave = Deno.env.get("OPENROUTER_API_KEY");
  if (!clave) return Response.json({ error: "Falta el secreto OPENROUTER_API_KEY" }, { status: 500, headers: CORS });

  let cuerpo: { model?: string; messages?: unknown[] };
  try { cuerpo = await req.json(); } catch { return Response.json({ error: "JSON inválido" }, { status: 400, headers: CORS }); }
  if (!Array.isArray(cuerpo.messages) || cuerpo.messages.length === 0) {
    return Response.json({ error: "Faltan los mensajes" }, { status: 400, headers: CORS });
  }

  const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + clave, "X-Title": "Montes Abogados" },
    // Siempre el modelo del servidor (el navegador manda un nombre de Pollinations que no existe en OpenRouter).
    body: JSON.stringify({ model: MODELO, messages: cuerpo.messages, temperature: 0.7 }),
  });
  return new Response(await r.text(), { status: r.status, headers: { ...CORS, "Content-Type": "application/json" } });
});
