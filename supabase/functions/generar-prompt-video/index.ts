// supabase/functions/generar-prompt-video/index.ts
// Genera un video completo por escenas (guion + prompt para herramienta de video con IA).
// Recibe la entrevista del panel: tema, puntos_clave, quien_habla, tono, llamada_accion, duracion.
// Con "correccion" + "borrador" aplica solo el ajuste pedido. Guarda el resultado como
// PENDIENTE de aprobación en la tabla propuestas.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const MODELO = Deno.env.get("OPENROUTER_MODEL") || "openrouter/free";
const SITIO = Deno.env.get("SITIO_WEB") || "https://montes-abogados-asociados.pages.dev";
const INSTRUCCIONES = "Eres el guionista y director creativo de Montes Abogados Asociados S.A.S., firma boutique de abogados en Bogotá D.C., Colombia. Escribes un video completo, escena por escena, para redes sociales, que el administrador copiará en una herramienta de video con IA.\n\nDATOS FIJOS (úsalos siempre, sin cambiarlos):\n- Sitio web: __SITIO__\n- WhatsApp: +57 300 725 7266\n- Correo: claudia@montes-a.com\n- Áreas reales: derecho comercial, laboral, litigio e insolvencia empresarial, administrativo, migratorio y recaudo de cartera.\n\nCONTENIDO:\n1. El video debe tratar el TEMA que dio el administrador y desarrollar sus PUNTOS CLAVE. Cada escena debe ser coherente con ese tema. No cambies de tema.\n2. Si no hay puntos clave, propone 2 o 3 puntos generales y coherentes, y anótalo en notas_revision.\n3. Enfoque: prevención jurídica, lenguaje claro, tono firme y cercano. Sin promesas de resultados, sin testimonios, sin cifras de casos ganados (Ley 1123 de 2007 limita la publicidad del abogado).\n4. No inventes cifras, porcentajes, plazos, artículos de ley ni montos. Si una explicación exige un dato exacto, dilo de forma general y anótalo en notas_revision para verificación por un abogado.\n5. Si quien habla es un presentador, descríbelo de forma genérica (sin rasgos identificables). Si es solo voz en off, usa imágenes de la oficina y de la reunión.\n\nESTRUCTURA:\n- Duración total: la indicada en el dato \"duracion_seg\" (30 o 60 segundos).\n- Divide el video en escenas con tiempos continuos (por ejemplo 0:00–0:07, 0:07–0:15 ...), sin huecos ni solapamientos, que sumen la duración total.\n- Cada escena tiene: Visual (qué se ve, encuadre, cámara, movimiento), VOZ EN OFF (texto exacto que se dice) y, si aplica, Texto en pantalla.\n- La última escena es el cierre: marca de la firma, eslogan breve, sitio web, WhatsApp y correo.\n- La voz en off es firme y pausada, en español natural para hablarse.\n\nResponde SOLO con JSON válido, sin texto antes ni después, con estas claves:\n- duracion_seg: número (15, 30 o 60).\n- prompt_dreamina: prompt completo, listo para pegar en una herramienta de video con IA. Describe CADA escena con su tiempo, su visual, lo que dice la voz en off y el texto en pantalla; además el formato vertical 9:16, la iluminación, la paleta sobria (azul, gris, blanco), la música sugerida y el cierre con __SITIO__, el WhatsApp +57 300 725 7266 y el correo claudia@montes-a.com. Sin logos de terceros.\n- guion: guion completo para el administrador, con este formato: \"# Guión: <título corto>\", luego \"**Duración aproximada: N segundos**\", luego cada escena como \"**ESCENA 1: <nombre> (0:00–0:07)**\", \"*Visual:* ...\", \"**VOZ EN OFF:** \\\"...\\\"\". Al final, \"**Recomendaciones de producción**\" con 3 o 4 viñetas breves (voz, música, versión corta para redes).\n- guion_voz: solo las frases de voz en off, en orden, separadas por saltos de línea.\n- texto_redes: caption para Instagram de máximo 3 líneas sobre el tema, seguido de 3 a 5 hashtags en la última línea.\n- notas_revision: cadena vacía, o las advertencias necesarias (datos a verificar, puntos propuestos, o algo que no se pudo cumplir).".split("__SITIO__").join(SITIO);

function respuesta(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return respuesta({ ok: false, error: "Método no permitido" }, 405);

  const clave = Deno.env.get("OPENROUTER_API_KEY");
  const urlBase = Deno.env.get("SUPABASE_URL");
  const servicio = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!clave || !urlBase || !servicio) {
    return respuesta({ ok: false, error: "Faltan secretos del servidor (OPENROUTER_API_KEY)" }, 500);
  }

  let entrada: Record<string, string>;
  try { entrada = await req.json(); } catch { return respuesta({ ok: false, error: "JSON inválido" }, 400); }

  // Duración válida: 15, 30 o 60 segundos. Por defecto 15.
  const numDuracion = Number(entrada.duracion);
  const duracion = [15, 30, 60].includes(numDuracion) ? numDuracion : 15;
  const datos = {
    tema: entrada.tema || "",
    puntos_clave: entrada.puntos_clave || "",
    quien_habla: entrada.quien_habla || "",
    tono: entrada.tono || "",
    llamada_accion: entrada.llamada_accion || "",
    duracion_seg: duracion,
    notas: entrada.notas || "",
  };
  if (!datos.tema && !entrada.correccion) {
    return respuesta({ ok: false, error: "Falta el tema del video" }, 400);
  }

  const contenidoUsuario = entrada.correccion
    ? "Borrador anterior:\n" + String(entrada.borrador || "").slice(0, 6000) +
      "\n\nTema original: " + datos.tema +
      "\n\nAplica SOLO esta corrección del administrador y devuelve el JSON completo corregido: " +
      String(entrada.correccion).slice(0, 1000) +
      "\nMantén las reglas obligatorias (duración " + duracion + " s, escenas con tiempos, sitio web, WhatsApp y correo)."
    : "Datos de la entrevista (JSON):\n" + JSON.stringify(datos);

  // 1) Pedir el video completo al modelo
  let texto = "";
  try {
    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + clave, "X-Title": "Montes Abogados" },
      body: JSON.stringify({
        model: MODELO,
        temperature: 0.7,
        max_tokens: 3000,
        messages: [
          { role: "system", content: INSTRUCCIONES },
          { role: "user", content: contenidoUsuario },
        ],
      }),
    });
    if (!r.ok) return respuesta({ ok: false, error: "La IA respondió " + r.status, detalle: await r.text() }, 502);
    const cuerpo = await r.json();
    texto = cuerpo?.choices?.[0]?.message?.content || "";
  } catch (e) {
    return respuesta({ ok: false, error: "No se pudo conectar con la IA: " + (e as Error).message }, 502);
  }

  // 2) Extraer y validar el JSON
  let d: Record<string, unknown>;
  const ini = texto.indexOf("{");
  const fin = texto.lastIndexOf("}");
  try {
    d = JSON.parse(ini >= 0 && fin > ini ? texto.slice(ini, fin + 1) : texto);
  } catch {
    return respuesta({ ok: false, error: "La IA no devolvió JSON válido", texto }, 502);
  }
  const errores: string[] = [];
  const prompt = String(d.prompt_dreamina || "");
  const guion = String(d.guion || "");
  if (prompt.length < 200) errores.push("prompt_dreamina vacío o muy corto");
  if (guion.length < 200) errores.push("el guion está vacío o muy corto");
  if (Number(d.duracion_seg) !== duracion) errores.push("la duración debe ser " + duracion + " segundos");
  if (!prompt.includes("pages.dev") && !prompt.includes(SITIO)) errores.push("falta el sitio web");
  if (!prompt.includes("300 725 7266")) errores.push("falta el WhatsApp");
  if (errores.length) return respuesta({ ok: false, error: errores.join("; "), datos: d }, 422);

  const guionVoz = String(d.guion_voz || "");
  const redes = String(d.texto_redes || "");
  const notasRevision = String(d.notas_revision || "");

  // 3) Guardar como propuesta PENDIENTE para aprobación
  const textoPropuesta = [
    "VIDEO (" + duracion + " s)", "", "GUION COMPLETO:", guion, "",
    "PROMPT PARA LA HERRAMIENTA DE VIDEO:", prompt, "",
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
    body: JSON.stringify({ tipo: "guion", texto: textoPropuesta, estado: "pendiente" }),
  });
  if (!g.ok) return respuesta({ ok: false, error: "No se pudo guardar la propuesta", detalle: await g.text() }, 500);

  return respuesta({
    ok: true,
    duracion_seg: duracion,
    guion,
    prompt_dreamina: prompt,
    guion_voz: guionVoz,
    texto_redes: redes,
    notas_revision: notasRevision,
  });
});
