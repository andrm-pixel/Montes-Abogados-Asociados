// supabase/functions/generar-prompt-video/index.ts
// Genera el prompt de video (30 s). Recibe lo que manda el panel (tipo "video", guion)
// o los datos del formulario, pide a OpenRouter el prompt de Dreamina y guarda el
// resultado en la tabla propuestas como PENDIENTE (nada se publica sin aprobación).

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const MODELO = Deno.env.get("OPENROUTER_MODEL") || "openrouter/free";
const INSTRUCCIONES = "Eres el redactor de contenido para redes sociales de Montes Abogados Asociados S.A.S. (firma de abogados en Bogotá D.C., Colombia). Tu única tarea es preparar UN video vertical para Instagram Reels de 30 segundos, en tres escenas, que el administrador copiará a Dreamina/HeyGen.\n\nDATOS FIJOS DEL DESPACHO (úsalos siempre, sin cambiarlos):\n- Dirección: Calle 106 # 58-27, oficina 706, Bogotá D.C.\n- Teléfono / WhatsApp: +57 300 725 7266\n- Sitio web: www.montes-a.com\n- Áreas reales: derecho comercial, laboral, litigio e insolvencia empresarial, administrativo, migratorio y recaudo de cartera.\n\nREGLAS OBLIGATORIAS:\n1. Video de 30 segundos, exactamente 3 escenas de 10 segundos cada una.\n2. Tono profesional, cercano y firme. Sin promesas de resultados, sin frases agresivas, sin lenguaje de garantía de éxito.\n3. No inventes cifras, casos, testimonios, premios, clientes ni servicios. Si el tema pide algo de eso, no lo incluyas y anótalo en notas_revision.\n4. Entorno visual por defecto: oficina luminosa y moderna, colores sobrios (azul, gris, blanco). Sin logos de terceros y sin textos largos en pantalla.\n5. No describas personas reales identificables. Si aparece un abogado, descríbelo de forma genérica.\n6. La escena 3 es el cierre: menciona la dirección, el teléfono y www.montes-a.com.\n7. El texto que se pide para redes debe tener máximo 3 líneas de llamado a la acción, con la dirección y el teléfono, y de 3 a 5 hashtags.\n\nResponde SOLO con JSON válido, sin texto antes ni después, con estas claves:\n- duracion_seg: 30\n- prompt_dreamina: prompt completo y listo para pegar. Debe describir las 3 escenas (visual y lo que dice el avatar), el tono, la iluminación, el encuadre vertical 9:16 y el cierre con la dirección, el teléfono y www.montes-a.com.\n- guion_voz: texto en español con los 3 bloques hablados, máximo 90 palabras en total.\n- texto_redes: caption para Instagram seguido de los hashtags en la última línea.\n- notas_revision: cadena vacía, o una advertencia si el tema pedía algo que no se pudo cumplir (por ejemplo cifras o casos concretos).";

function respuesta(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return respuesta({ ok: false, error: "Método no permitido" }, 405);

  const clave = Deno.env.get("OPENROUTER_API_KEY");
  const urlBase = Deno.env.get("SUPABASE_URL");
  const servicio = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!clave || !urlBase || !servicio) return respuesta({ ok: false, error: "Faltan secretos del servidor (OPENROUTER_API_KEY)" }, 500);

  let entrada: Record<string, string>;
  try { entrada = await req.json(); } catch { return respuesta({ ok: false, error: "JSON inválido" }, 400); }

  // Acepta el formato del panel ({ guion }) o el del formulario ({ tema, ... }).
  const datos = entrada.guion
    ? { tema: "Según el guion del administrador", notas: String(entrada.guion).slice(0, 2000) }
    : { tema: entrada.tema || "", mensaje_clave: entrada.mensaje_clave || "", tono: entrada.tono || "",
        entorno: entrada.entorno || "", llamada_accion: entrada.llamada_accion || "", notas: entrada.notas || "" };

  // 1) Pedir el prompt a OpenRouter (modo JSON)
  let texto = "";
  try {
    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + clave, "X-Title": "Montes Abogados" },
      body: JSON.stringify({
        model: MODELO,
        temperature: 0.7,
        messages: [
          { role: "system", content: INSTRUCCIONES },
          { role: "user", content: entrada.correccion
              ? "Borrador anterior:\n" + String(entrada.borrador || "").slice(0, 4000) +
                "\n\nTema original: " + datos.tema +
                "\n\nAplica SOLO esta corrección del administrador y devuelve el JSON completo corregido: " +
                String(entrada.correccion).slice(0, 1000) +
                "\nMantén todas las reglas obligatorias (30 segundos, 3 escenas, dirección, teléfono y www.montes-a.com)."
              : "Datos del formulario (JSON):\n" + JSON.stringify(datos) },
        ],
      }),
    });
    if (!r.ok) return respuesta({ ok: false, error: "La IA respondió " + r.status, detalle: await r.text() }, 502);
    const cuerpo = await r.json();
    texto = cuerpo?.choices?.[0]?.message?.content || "";
  } catch (e) {
    return respuesta({ ok: false, error: "No se pudo conectar con la IA: " + (e as Error).message }, 502);
  }

  // 2) Validar la respuesta (reglas del despacho)
  let d: Record<string, unknown>;
  const ini = texto.indexOf("{");
  const fin = texto.lastIndexOf("}");
  try { d = JSON.parse(ini >= 0 && fin > ini ? texto.slice(ini, fin + 1) : texto); } catch { return respuesta({ ok: false, error: "La IA no devolvió JSON válido", texto }, 502); }
  const errores: string[] = [];
  const prompt = String(d.prompt_dreamina || "");
  if (prompt.length < 50) errores.push("prompt_dreamina vacío o muy corto");
  if (Number(d.duracion_seg) !== 30) errores.push("la duración debe ser 30 segundos");
  if (!prompt.includes("montes-a.com")) errores.push("falta la referencia a www.montes-a.com");
  if (!prompt.includes("Calle 106")) errores.push("falta la dirección del despacho");
  if (!prompt.includes("300 725 7266")) errores.push("falta el teléfono del despacho");
  if (errores.length) return respuesta({ ok: false, error: errores.join("; "), datos: d }, 422);

  const guionVoz = String(d.guion_voz || "");
  const redes = String(d.texto_redes || "");
  const notasRevision = String(d.notas_revision || "");

  // 3) Guardar como propuesta PENDIENTE para que la apruebe el administrador
  const texto_propuesta = [
    "PROMPT DREAMINA (30 s):", prompt, "",
    "GUION DE VOZ:", guionVoz, "",
    "TEXTO PARA REDES:", redes,
    notasRevision ? "\nNOTAS DE REVISIÓN: " + notasRevision : "",
  ].join("\n");

  const g = await fetch(urlBase + "/rest/v1/propuestas", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: servicio,
      Authorization: "Bearer " + servicio,
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ tipo: "guion", texto: texto_propuesta, estado: "pendiente" }),
  });
  if (!g.ok) return respuesta({ ok: false, error: "No se pudo guardar la propuesta", detalle: await g.text() }, 500);

  return respuesta({ ok: true, prompt_dreamina: prompt, guion_voz: guionVoz, texto_redes: redes, notas_revision: notasRevision, duracion_seg: 30 });
});
