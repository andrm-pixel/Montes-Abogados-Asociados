// supabase/functions/generar-prompt-video/index.ts
// Genera uno o varios videos completos para Instagram Reels: guion por escenas, prompts para la
// herramienta de video partidos en bloques de 15 s (parte 1, continuación, ...) y texto para redes.
// Respuesta del modelo en secciones con marcadores (más fiable que JSON con modelos gratuitos).
// Cada video queda como PENDIENTE de aprobación en la tabla propuestas.
import {
  CONTACTO_CIERRE, ENFOQUES, FRASE_CIERRE, MAX_VIDEOS, NOMBRE_FIRMA, SITIO_WEB, WHATSAPP,
  aMultiploDe15, armarPartes, construirPartes, extraerEscenas, normaliza, parsearPartes,
  partesDe, rango, repartirServicios, secciones, serviciosFaltantes,
} from "../_shared/video.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const MODELO = Deno.env.get("OPENROUTER_MODEL") || "openrouter/free";

const SISTEMA = `Eres el guionista y director creativo de ${NOMBRE_FIRMA}, firma boutique de abogados en Bogotá D.C., Colombia. Escribes un video vertical para Instagram Reels, escena por escena, que el administrador copiará en una herramienta de video con IA que solo genera clips de 15 segundos.

DATOS FIJOS: Sitio web ${SITIO_WEB}. WhatsApp ${WHATSAPP} (siempre con pausa en 300, 725, 7266 para que la voz no diga 307). Correo claudia@montes-a.com. NO escribas www.montes-a.com.

REGLAS:
1. El video trata el TEMA que dio el administrador y desarrolla sus PUNTOS CLAVE. No cambies de tema.
2. Duración total: la de DURACION, dividida en bloques de 15 s (0:00–0:15, 0:15–0:30, ...). Cada escena empieza y termina DENTRO de un mismo bloque: ninguna escena cruza un múltiplo de 15 s. Cada bloque tiene 1 o 2 escenas y como máximo 38 palabras de voz en off.
3. Sin promesas de resultados, sin testimonios, sin cifras de casos ganados, sin inventar cifras, plazos, artículos de ley ni montos. Si algo necesita un dato exacto, dilo de forma general y anótalo en NOTAS.
4. Si no hay puntos clave, propón 2 o 3 puntos generales y coherentes, y anótalo en NOTAS.
5. Presentador genérico, sin rasgos identificables. Si es voz en off, usa imágenes de la oficina y de reuniones.
6. CIERRE (texto fijo, en la última escena y en la última parte): la voz en off dice «${FRASE_CIERRE} ${CONTACTO_CIERRE}» (haciendo una pausa clara en +57, 300, 725, 7266) y el texto en pantalla dice «${CONTACTO_CIERRE}». Nunca uses www.montes-a.com.
7. Si piden los SERVICIOS, la voz en off nombra los servicios que se te asignen en cada bloque, con esas palabras, y entre todos los bloques salen los siete.

ESTRUCTURA DEL GUION (ejemplo de 60 s; para otra duración adapta escenas y tiempos):
# Guión: Montes Abogados Asociados
**Duración aproximada: 60 segundos**

**ESCENA 1: Apertura (0:00–0:07)**
*Visual:* Toma cenital de un escritorio con una carpeta cerrada y una taza de café. Una mano abre la carpeta.
**VOZ EN OFF:** "Los mejores litigios son los que nunca llegan a existir."

**ESCENA 2: El problema (0:07–0:15)**
*Visual:* Un empresario revisa documentos con preocupación. Se ven un contrato, una notificación y un calendario.
**VOZ EN OFF:** "Cada decisión de su empresa trae riesgos jurídicos. Muchos no se ven hasta que ya cuestan tiempo, dinero y tranquilidad."

(… una escena o dos por cada bloque de 15 s …)

**ESCENA 7: Cierre (0:52–1:00)**
*Visual:* Logo centrado sobre fondo blanco sobrio y, debajo, el texto de contacto.
**VOZ EN OFF:** "${FRASE_CIERRE}"
*Texto en pantalla:* **${CONTACTO_CIERRE}**

**Recomendaciones de producción**
- **Voz:** firme y pausada. **Música:** piano o cuerdas suaves. **Ética profesional:** sin promesas de resultados; compatible con la Ley 1123 de 2007.

FORMATO DE RESPUESTA OBLIGATORIO: escribe exactamente estas cuatro secciones, con estos marcadores y en este orden. No escribas nada antes ni después.

### GUION
(el guion completo, con escenas, tiempos, visual, VOZ EN OFF y recomendaciones de producción, igual que el ejemplo)

### PROMPT
(un bloque por cada 15 s, con este marcador exacto, y nada más entre bloques)
#### PARTE 1 de N (0:00–0:15)
(prompt completo en español para la herramienta de video, listo para pegar: formato vertical 9:16, 15 segundos, lo que se ve, lo que dice la voz en off, texto en pantalla, iluminación, paleta azul, gris y blanco, y música suave)
#### PARTE 2 de N (0:15–0:30)
(igual; empieza indicando que continúa la parte anterior con el mismo presentador, oficina y estilo)
(… hasta la última parte, que termina con el cierre fijo sobre fondo blanco sobrio)

### REDES
(caption para Instagram de máximo 3 líneas sobre el tema, y en la última línea de 3 a 5 hashtags)

### NOTAS
(datos que deben verificarse, puntos propuestos, o "Ninguna")`;

const respuesta = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...CORS, "Content-Type": "application/json" } });

async function pedirAlModelo(clave: string, mensajes: { role: string; content: string }[]) {
  const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + clave, "X-Title": "Montes Abogados" },
    body: JSON.stringify({ model: MODELO, temperature: 0.7, max_tokens: 6000, messages: mensajes }),
  });
  if (!r.ok) throw new Error("La IA respondió " + r.status + ": " + (await r.text()).slice(0, 300));
  const cuerpo = await r.json();
  return String(cuerpo?.choices?.[0]?.message?.content || "");
}

interface Datos {
  tema: string;
  duracion: number;
  puntos: string;
  quien: string;
  tono: string;
  llamada: string;
  incluirServicios: boolean;
  totalVideos: number;
  correccion: string;
  borrador: string;
}

/** Genera UN video (guion + partes de 15 s + redes + notas). */
async function generarUno(clave: string, numero: number, d: Datos) {
  const total = partesDe(d.duracion);
  const enfoque = ENFOQUES[(numero - 1) % ENFOQUES.length];
  const grupos = d.incluirServicios ? repartirServicios(total) : [];

  const lineas = [
    "TEMA: " + d.tema,
    "DURACION: " + d.duracion + " segundos (" + total + " bloque" + (total > 1 ? "s" : "") + " de 15 s)",
    "PUNTOS CLAVE: " + (d.puntos || "(no indicados: propón 2 o 3 puntos coherentes con el tema)"),
    "QUIEN HABLA: " + (d.quien || "voz en off con presentador genérico"),
    "TONO: " + (d.tono || "cálido y profesional"),
    "LLAMADA A LA ACCIÓN: " + (d.llamada || CONTACTO_CIERRE),
  ];
  if (d.totalVideos > 1) {
    lineas.push("VIDEO " + numero + " de " + d.totalVideos + ". ENFOQUE DE ESTE VIDEO: " + enfoque + " Que no se parezca a los otros videos.");
  }
  if (grupos.length) {
    lineas.push(
      "SERVICIOS A NOMBRAR EN LA VOZ EN OFF (uno por uno, con estas palabras):\n" +
        grupos.map((g, i) => "- Bloque " + (i + 1) + " (" + rango(i + 1) + "): " + (g.length ? g.join(", ") : "ninguno, solo historia y cierre")).join("\n")
    );
  }

  const usuario = d.correccion
    ? "Este es el video anterior:\n\n" + d.borrador.slice(0, 6000) +
      "\n\nAplica SOLO este ajuste del administrador y vuelve a escribir las cuatro secciones completas: " + d.correccion.slice(0, 1000) +
      "\nMantén la duración de " + d.duracion + " segundos, los bloques de 15 s y todas las reglas.\n\nDatos:\n" + lineas.join("\n")
    : "Datos de la entrevista:\n" + lineas.join("\n") + "\n\nEscribe el video completo con las cuatro secciones.";

  const mensajes = [
    { role: "system", content: SISTEMA.replace("DURACION", "DURACION (" + d.duracion + " segundos)") },
    { role: "user", content: usuario },
  ];

  let s: Record<string, string> = {};
  let partesTexto: string[] = [];
  let guion = "";
  for (let intento = 1; intento <= 2; intento++) {
    const texto = await pedirAlModelo(clave, mensajes);
    s = secciones(texto);
    guion = normaliza(s.GUION || "");
    const escenas = extraerEscenas(guion);
    // Prompts por bloque: los del modelo si vienen completos; si no, se arman con las escenas del guion.
    partesTexto = parsearPartes(s.PROMPT || "");
    if (partesTexto.length !== total || partesTexto.some((p) => p.length < 60)) {
      partesTexto = construirPartes(escenas, total) || [];
    }
    const completo = guion.length >= 120 && escenas.length >= total && partesTexto.length === total;
    const faltan = d.incluirServicios ? serviciosFaltantes(guion) : [];
    if (completo && !faltan.length) break;
    if (intento === 2) break;
    mensajes.push({ role: "assistant", content: texto });
    mensajes.push({
      role: "user",
      content:
        "Tu respuesta quedó incompleta. Escribe de nuevo las cuatro secciones completas (### GUION, ### PROMPT con " + total +
        " partes marcadas como #### PARTE n de " + total + ", ### REDES, ### NOTAS). Ninguna escena cruza un múltiplo de 15 s." +
        (faltan.length ? " Faltó nombrar estos servicios: " + faltan.join(", ") + "." : ""),
    });
  }

  if (guion.length < 120) throw new Error("el guion está incompleto");
  if (partesTexto.length !== total) throw new Error("no se pudo dividir el video en " + total + " partes de 15 s");

  const partes = armarPartes(partesTexto, numero, d.totalVideos);
  if (!guion.includes(FRASE_CIERRE)) guion += "\n\nCIERRE: voz en off: \"" + FRASE_CIERRE + "\" Texto en pantalla: \"" + CONTACTO_CIERRE + "\"";

  const redes = normaliza(s.REDES || "");
  let notas = normaliza(s.NOTAS || "");
  if (/^ninguna\.?$/i.test(notas.trim())) notas = "";
  const faltan = d.incluirServicios ? serviciosFaltantes(guion) : [];
  if (faltan.length) notas = (notas ? notas + "\n" : "") + "Revisa: no se nombró en la voz en off " + faltan.join(", ") + ". Pide un ajuste para añadirlo.";

  return { numero, duracion_seg: d.duracion, total_partes: total, guion, partes, texto_redes: redes, notas_revision: notas };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return respuesta({ ok: false, error: "Método no permitido" }, 405);

  const clave = Deno.env.get("OPENROUTER_API_KEY");
  const urlBase = Deno.env.get("SUPABASE_URL");
  const servicio = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!clave || !urlBase || !servicio) return respuesta({ ok: false, error: "Faltan secretos del servidor (OPENROUTER_API_KEY)" }, 500);

  let e: Record<string, unknown>;
  try { e = await req.json(); } catch { return respuesta({ ok: false, error: "JSON inválido" }, 400); }

  const texto = (k: string) => String(e[k] ?? "").trim();
  const tema = texto("tema");
  const correccion = texto("correccion");
  if (!tema && !correccion) return respuesta({ ok: false, error: "Falta el tema del video" }, 400);

  const duracion = aMultiploDe15(Number(e.duracion) || 60); // 15, 30, 45, 60 ... hasta 120 s
  const cantidad = Math.min(MAX_VIDEOS, Math.max(1, Math.round(Number(e.cantidad_videos)) || 1));
  const numeroCorreccion = Math.min(MAX_VIDEOS, Math.max(1, Math.round(Number(e.numero_video)) || 1));
  const numeros = correccion ? [numeroCorreccion] : Array.from({ length: cantidad }, (_, i) => i + 1);

  const datos: Datos = {
    tema,
    duracion,
    puntos: texto("puntos_clave"),
    quien: texto("quien_habla"),
    tono: texto("tono"),
    llamada: texto("llamada_accion"),
    incluirServicios: e.incluir_servicios === true || e.incluir_servicios === "true",
    totalVideos: correccion ? Math.max(cantidad, numeroCorreccion) : cantidad,
    correccion,
    borrador: texto("borrador"),
  };

  // Los videos se piden a la vez, cada uno con su propio enfoque.
  const resultados = await Promise.allSettled(numeros.map((n) => generarUno(clave, n, datos)));
  const videos = resultados.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
  const fallos = resultados.flatMap((r, i) => (r.status === "rejected" ? ["video " + numeros[i] + ": " + (r.reason as Error).message] : []));
  if (!videos.length) return respuesta({ ok: false, error: fallos.join("; ") + ". Pulsa de nuevo para reintentar." }, 422);

  // Cada video queda PENDIENTE de aprobación.
  for (const v of videos) {
    const textoPropuesta = [
      "VIDEO " + v.numero + " (" + v.duracion_seg + " s en " + v.total_partes + " parte" + (v.total_partes > 1 ? "s" : "") + " de 15 s, Instagram Reels 9:16)", "",
      "GUION:", v.guion, "",
      ...v.partes.flatMap((p) => [p.texto, ""]),
      "TEXTO PARA REDES:", v.texto_redes,
      v.notas_revision ? "\nNOTAS DE REVISIÓN: " + v.notas_revision : "",
    ].join("\n");
    const g = await fetch(urlBase + "/rest/v1/propuestas", {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: servicio, Authorization: "Bearer " + servicio, Prefer: "return=minimal" },
      body: JSON.stringify({ tipo: "guion", texto: textoPropuesta, estado: "pendiente" }),
    });
    if (!g.ok) return respuesta({ ok: false, error: "No se pudo guardar la propuesta", detalle: await g.text() }, 500);
  }

  const primero = videos[0];
  return respuesta({
    ok: true,
    duracion_seg: duracion,
    cantidad: videos.length,
    videos,
    avisos: fallos,
    // Campos de la versión anterior (compatibilidad): se llenan con el primer video.
    guion: primero.guion,
    prompt_dreamina: primero.partes.map((p) => p.texto).join("\n\n"),
    guion_voz: "",
    texto_redes: primero.texto_redes,
    notas_revision: primero.notas_revision,
  });
});
