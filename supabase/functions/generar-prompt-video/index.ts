// supabase/functions/generar-prompt-video/index.ts
// Genera el prompt de video (30 s) con su guion. Recibe la entrevista del panel:
// tema, puntos_clave, quien_habla, tono, llamada_accion. Con "correccion" + "borrador"
// aplica solo el ajuste pedido. Guarda el resultado como PENDIENTE en propuestas.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const MODELO = Deno.env.get("OPENROUTER_MODEL") || "openrouter/free";
const INSTRUCCIONES = "Eres el redactor de contenido para redes sociales de Montes Abogados Asociados S.A.S. (firma de abogados en Bogotá D.C., Colombia). Preparas UN video vertical de 30 segundos para Instagram Reels, donde una persona explica un tema jurídico. El administrador lo copiará a Dreamina o HeyGen.\n\nDATOS FIJOS DEL DESPACHO (úsalos siempre, sin cambiarlos):\n- Dirección: Calle 106 # 58-27, oficina 706, Bogotá D.C.\n- Teléfono / WhatsApp: +57 300 725 7266\n- Sitio web: www.montes-a.com\n- Áreas reales: derecho comercial, laboral, litigio e insolvencia empresarial, administrativo, migratorio y recaudo de cartera.\n\nCONTENIDO (lo más importante):\n1. El guion debe EXPLICAR el tema pedido, no hablar genéricamente del despacho. Usa los puntos clave que dio el administrador y desarróllalos con información general, verificable y pedagógica: qué es, a quién aplica y un consejo práctico.\n2. Sé coherente con el tema: si el tema es liquidación de prestaciones, el guion habla de prestaciones sociales; no cambies de tema.\n3. No inventes cifras, porcentajes, plazos, artículos de ley, montos, casos, testimonios ni premios. Si una explicación necesita un dato exacto, dilo de forma general y anótalo en notas_revision para que un abogado lo verifique.\n4. Si el administrador no dio puntos clave, propone 2 o 3 puntos generales y coherentes con el tema, y anótalo en notas_revision.\n5. Tono y formato: profesional, cercano y firme. Sin promesas de resultados ni frases agresivas. Lenguaje claro para el público general.\n\nESTRUCTURA DEL VIDEO (30 segundos):\n- Escena 1 (0-10 s): gancho con la pregunta o el problema del tema.\n- Escena 2 (10-20 s): la explicación con los puntos clave.\n- Escena 3 (20-30 s): cierre con la dirección, el teléfono y www.montes-a.com.\n\nREGLAS DEL PROMPT Y DEL GUION:\n- Si quien habla es un presentador genérico, descríbelo sin rasgos identificables. Si el administrador eligió solo voz en off, describe imágenes de la oficina.\n- Entorno por defecto: oficina luminosa y moderna, colores sobrios (azul, gris, blanco). Sin logos de terceros y sin textos largos en pantalla.\n- El guion_voz tiene entre 70 y 85 palabras y debe sonar natural al hablarse en 30 segundos.\n\nResponde SOLO con JSON válido, sin texto antes ni después, con estas claves:\n- duracion_seg: 30\n- prompt_dreamina: prompt completo y listo para pegar. Describe las tres escenas, lo que dice la persona en cada una (resumen del guion), el encuadre vertical 9:16, la iluminación y el cierre con la dirección, el teléfono y www.montes-a.com.\n- guion_voz: texto en español con los tres bloques hablados, entre 70 y 85 palabras.\n- texto_redes: caption para Instagram de máximo 3 líneas sobre el tema, seguido de 3 a 5 hashtags en la última línea.\n- notas_revision: cadena vacía, o las advertencias necesarias (datos que deben verificarse, puntos que se propusieron, o algo que no se pudo cumplir).";

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

  const datos = {
    tema: entrada.tema || "",
    puntos_clave: entrada.puntos_clave || "",
    quien_habla: entrada.quien_habla || "",
    tono: entrada.tono || "",
    llamada_accion: entrada.llamada_accion || "",
    mensaje_clave: entrada.mensaje_clave || "",
    notas: entrada.notas || "",
  };
  if (!datos.tema && !entrada.correccion) {
    return respuesta({ ok: false, error: "Falta el tema del video" }, 400);
  }

  const contenidoUsuario = entrada.correccion
    ? "Borrador anterior:\n" + String(entrada.borrador || "").slice(0, 4000) +
      "\n\nTema original: " + datos.tema +
      "\n\nAplica SOLO esta corrección del administrador y devuelve el JSON completo corregido: " +
      String(entrada.correccion).slice(0, 1000) +
      "\nMantén todas las reglas obligatorias (30 segundos, 3 escenas, dirección, teléfono y www.montes-a.com)."
    : "Datos de la entrevista (JSON):\n" + JSON.stringify(datos);

  // 1) Pedir el prompt y el guion al modelo
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
  if (prompt.length < 50) errores.push("prompt_dreamina vacío o muy corto");
  if (Number(d.duracion_seg) !== 30) errores.push("la duración debe ser 30 segundos");
  if (!prompt.includes("montes-a.com")) errores.push("falta la referencia a www.montes-a.com");
  if (!prompt.includes("Calle 106")) errores.push("falta la dirección del despacho");
  if (!prompt.includes("300 725 7266")) errores.push("falta el teléfono del despacho");
  if (errores.length) return respuesta({ ok: false, error: errores.join("; "), datos: d }, 422);

  const guionVoz = String(d.guion_voz || "");
  const redes = String(d.texto_redes || "");
  const notasRevision = String(d.notas_revision || "");

  // 3) Guardar como propuesta PENDIENTE para aprobación
  const textoPropuesta = [
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
    body: JSON.stringify({ tipo: "guion", texto: textoPropuesta, estado: "pendiente" }),
  });
  if (!g.ok) return respuesta({ ok: false, error: "No se pudo guardar la propuesta", detalle: await g.text() }, 500);

  return respuesta({
    ok: true,
    prompt_dreamina: prompt,
    guion_voz: guionVoz,
    texto_redes: redes,
    notas_revision: notasRevision,
    duracion_seg: 30,
  });
});
