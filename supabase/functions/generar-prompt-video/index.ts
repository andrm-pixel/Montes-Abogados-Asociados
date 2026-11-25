// supabase/functions/generar-prompt-video/index.ts
// Genera un video completo por escenas para Instagram Reels: guion, prompt para la
// herramienta de video con IA y texto para redes. Recibe la entrevista del panel.
// Respuesta en secciones con marcadores (más fiable que JSON con modelos gratuitos).
// Guarda el resultado como PENDIENTE de aprobación en la tabla propuestas.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const MODELO = Deno.env.get("OPENROUTER_MODEL") || "openrouter/free";
const SITIO = Deno.env.get("SITIO_WEB") || "https://montes-abogados-asociados.pages.dev";
const SITIO_HOST = SITIO.replace(/^https?:\/\//, "").replace(/\/$/, "");
const SISTEMA = "Eres el guionista y director creativo de Montes Abogados Asociados S.A.S., firma boutique de abogados en Bogotá D.C., Colombia. Escribes un video vertical para Instagram Reels, escena por escena, que el administrador copiará en una herramienta de video con IA.\n\nDATOS FIJOS (úsalos siempre):\n- Sitio web: __SITIO__\n- WhatsApp: +57 300 725 7266\n- Correo: claudia@montes-a.com\n\nREGLAS:\n1. El video trata el TEMA que dio el administrador y desarrolla sus PUNTOS CLAVE. No cambies de tema.\n2. Duración total: la indicada en DURACION. Ajusta los tiempos de las escenas para que sumen exactamente esa duración. Para 15 segundos usa 2 o 3 escenas cortas.\n3. Sin promesas de resultados, sin testimonios, sin cifras de casos ganados, sin inventar cifras, plazos, artículos de ley ni montos. Si algo necesita un dato exacto, dilo de forma general y anótalo en NOTAS.\n4. Si no hay puntos clave, propone 2 o 3 puntos generales y coherentes, y anótalo en NOTAS.\n5. Presentador genérico, sin rasgos identificables. Si es voz en off, usa imágenes de la oficina y de reuniones.\n6. Cierre: marca, eslogan, sitio web, WhatsApp y correo.\n\nESTRUCTURA Y ESTILO DE REFERENCIA (ejemplo de 60 segundos; para otra duración adapta escenas y tiempos):\n# Guión: Montes Abogados Asociados\n**Duración aproximada: 60 segundos**\n\n**ESCENA 1: Apertura (0:00–0:07)**\n*Visual:* Toma cenital de un escritorio con una carpeta cerrada y una taza de café. Una mano abre la carpeta.\n**VOZ EN OFF:** \"Los mejores litigios son los que nunca llegan a existir.\"\n\n**ESCENA 2: El problema (0:07–0:15)**\n*Visual:* Un empresario revisa documentos con preocupación. Se ven un contrato, una notificación y un calendario.\n**VOZ EN OFF:** \"Cada decisión de su empresa trae riesgos jurídicos. Muchos no se ven hasta que ya cuestan tiempo, dinero y tranquilidad.\"\n\n**ESCENA 3: Presentación (0:15–0:23)**\n*Visual:* Logo de Montes Abogados Asociados. Luego, el equipo entra a una sala de reuniones luminosa.\n**VOZ EN OFF:** \"En Montes Abogados Asociados somos una firma boutique. Trabajamos con pocos clientes para conocer a fondo a cada uno.\"\n\n**ESCENA 4: Cercanía (0:23–0:32)**\n*Visual:* Una abogada conversa con un cliente, toma notas y le da la mano. Tono cálido y natural.\n**VOZ EN OFF:** \"Aquí no es un número de expediente. Lo escuchamos, entendemos su negocio y estamos cuando nos necesita.\"\n\n**ESCENA 5: Enfoque preventivo (0:32–0:42)**\n*Visual:* Primeros planos de contratos revisados, anotaciones al margen, una reunión de planeación.\n**VOZ EN OFF:** \"Nuestro enfoque es preventivo. Anticipamos riesgos, blindamos sus decisiones y evitamos que las contingencias de hoy se vuelvan los litigios de mañana.\"\n\n**ESCENA 6: Su área jurídica (0:42–0:52)**\n*Visual:* El cliente, ya tranquilo, trabaja en su oficina mientras recibe un mensaje del equipo de la firma.\n**VOZ EN OFF:** \"Somos su ayuda especializada. Nos convertimos en su área jurídica para que usted se concentre en lo que mejor sabe hacer: hacer crecer su empresa.\"\n\n**ESCENA 7: Cierre (0:52–1:00)**\n*Visual:* Logo centrado, eslogan en pantalla, datos de contacto (web, WhatsApp, correo).\n**VOZ EN OFF:** \"Montes Abogados Asociados. Su aliado jurídico estratégico.\"\n*Texto en pantalla:* **Prevenir es nuestra estrategia.**\n\n**Recomendaciones de producción**\n- **Voz:** firme y pausada, que transmita autoridad sin sonar distante.\n- **Música:** piano o cuerdas suaves que vayan subiendo en la escena 5.\n- **Versión corta para redes (15 s):** usa las escenas 1, 5 y 7.\n- **Ética profesional:** sin promesas de resultados; compatible con la Ley 1123 de 2007.\n\nFORMATO DE RESPUESTA OBLIGATORIO: escribe exactamente estas cuatro secciones, con estos marcadores y en este orden. No escribas nada antes ni después.\n\n### GUION\n(el guion completo, con escenas, tiempos, visual, VOZ EN OFF y recomendaciones de producción, igual que el ejemplo)\n\n### PROMPT\n(prompt completo para la herramienta de video con IA, en español: describe CADA escena con su tiempo, lo que se ve, lo que dice la voz en off y el texto en pantalla; formato vertical 9:16; iluminación; paleta sobria azul, gris y blanco; música sugerida; y el cierre con __SITIO__, WhatsApp +57 300 725 7266 y correo claudia@montes-a.com)\n\n### REDES\n(caption para Instagram de máximo 3 líneas sobre el tema, y en la última línea de 3 a 5 hashtags)\n\n### NOTAS\n(datos que deben verificarse, puntos propuestos, o \"Ninguna\")".split("__SITIO__").join(SITIO);

function respuesta(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

// Enlaces markdown y dominio viejo: se corrigen aquí (el correo no se toca).
function normaliza(t: string) {
  return t
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/(www\.)?montes-a\.com\/?/gi, SITIO)
    .replace(/(?<![@\w.-])(www\.)?montes-a\.com(?![\w.-])/gi, SITIO_HOST);
}

// Separa las cuatro secciones por sus marcadores.
function secciones(texto: string) {
  const partes: Record<string, string> = {};
  const regex = /###\s*(GUION|PROMPT|REDES|NOTAS)\s*\n?/gi;
  const marcas: { clave: string; inicio: number; fin: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(texto)) !== null) {
    marcas.push({ clave: m[1].toUpperCase(), inicio: m.index, fin: regex.lastIndex });
  }
  for (let i = 0; i < marcas.length; i++) {
    const fin = i + 1 < marcas.length ? marcas[i + 1].inicio : texto.length;
    partes[marcas[i].clave] = texto.slice(marcas[i].fin, fin).trim();
  }
  return partes;
}

async function pedirAlModelo(clave: string, mensajes: { role: string; content: string }[]) {
  const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + clave, "X-Title": "Montes Abogados" },
    body: JSON.stringify({ model: MODELO, temperature: 0.7, max_tokens: 3500, messages: mensajes }),
  });
  if (!r.ok) throw new Error("La IA respondió " + r.status + ": " + (await r.text()).slice(0, 300));
  const cuerpo = await r.json();
  return String(cuerpo?.choices?.[0]?.message?.content || "");
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

  const tema = entrada.tema || "";
  if (!tema && !entrada.correccion) return respuesta({ ok: false, error: "Falta el tema del video" }, 400);

  const datos = [
    "TEMA: " + tema,
    "DURACION: " + duracion + " segundos",
    "PUNTOS CLAVE: " + (entrada.puntos_clave || "(no indicados: propón 2 o 3 puntos coherentes con el tema)"),
    "QUIEN HABLA: " + (entrada.quien_habla || "presentador genérico"),
    "TONO: " + (entrada.tono || "cálido y profesional"),
    "LLAMADA A LA ACCIÓN: " + (entrada.llamada_accion || "escribirnos por WhatsApp o visitar la página"),
  ].join("\n");

  const usuario = entrada.correccion
    ? "Este es el video anterior:\n\n" + String(entrada.borrador || "").slice(0, 6000) +
      "\n\nAplica SOLO este ajuste del administrador y vuelve a escribir las cuatro secciones completas: " +
      String(entrada.correccion).slice(0, 1000) +
      "\nMantén la duración de " + duracion + " segundos y todas las reglas."
    : "Datos de la entrevista:\n" + datos + "\n\nEscribe el video completo con las cuatro secciones.";

  const mensajes = [
    { role: "system", content: SISTEMA.replace("DURACION", "DURACION (" + duracion + " segundos)") },
    { role: "user", content: usuario },
  ];

  // 1) Pedir el video; si falta alguna sección, reintenta una vez.
  let s: Record<string, string> = {};
  let texto = "";
  try {
    for (let intento = 1; intento <= 2; intento++) {
      texto = await pedirAlModelo(clave, mensajes);
      s = secciones(texto);
      if ((s.GUION || "").length >= 120 && (s.PROMPT || "").length >= 120) break;
      mensajes.push({ role: "assistant", content: texto });
      mensajes.push({
        role: "user",
        content: "Tu respuesta llegó incompleta. Escribe de nuevo las cuatro secciones completas (### GUION, ### PROMPT, ### REDES, ### NOTAS), con el guion de escenas completo.",
      });
    }
  } catch (e) {
    return respuesta({ ok: false, error: "No se pudo conectar con la IA: " + (e as Error).message }, 502);
  }

  const guion = normaliza(s.GUION || "");
  const prompt = normaliza(s.PROMPT || "");
  const redes = normaliza(s.REDES || "");
  const notas = normaliza(s.NOTAS || "");

  // 2) Validar
  const errores: string[] = [];
  if (guion.length < 120) errores.push("el guion está incompleto");
  if (!/ESCENA\s*1/i.test(guion)) errores.push("el guion no tiene escenas");
  if (prompt.length < 120) errores.push("el prompt está incompleto");
  if (!prompt.includes(SITIO_HOST)) errores.push("falta el sitio web en el prompt");
  if (!prompt.includes("300 725 7266")) errores.push("falta el WhatsApp en el prompt");
  if (errores.length) return respuesta({ ok: false, error: errores.join("; ") + ". Pulsa de nuevo para reintentar." }, 422);

  // 3) Guardar como propuesta PENDIENTE para aprobación
  const textoPropuesta = [
    "VIDEO (" + duracion + " s, Instagram Reels 9:16)", "",
    "GUION:", guion, "",
    "PROMPT PARA LA HERRAMIENTA DE VIDEO:", prompt, "",
    "TEXTO PARA REDES:", redes,
    notas && notas.toLowerCase() !== "ninguna" ? "\nNOTAS DE REVISIÓN: " + notas : "",
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
    guion_voz: "",
    texto_redes: redes,
    notas_revision: notas.toLowerCase() === "ninguna" ? "" : notas,
  });
});
