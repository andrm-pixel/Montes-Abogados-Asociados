/* =============================================================
   SERVICIO DE IA (Pollinations, gratis y sin clave)
   -------------------------------------------------------------
   REGLA DE SEGURIDAD: aquí NO vive ningún secreto. El navegador
   solo conoce la URL pública del motor; las claves reales
   (Gemini, Supabase service role, Dreamina) están en el .env del
   servidor (supabase/functions/agente-ia), nunca este archivo.
   ============================================================= */

import type { Mensaje, Pestana } from "./tipos";

/** URL del motor. En desarrollo usa Pollinations si no hay .env. */
const URL_IA =
  (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_IA_URL ||
  "https://text.pollinations.ai/openai";


/** Contexto de marca: colores, teléfono, correo y las 3 reglas. */
const CONTEXTO_MARCA = [
  "Eres el asistente de contenido de Montes Abogados Asociados S.A.S., firma jurídica colombiana con sede en Bogotá D.C. y cobertura nacional.",
  "Idioma: español (usa inglés solo si te lo piden).",
  "Colores de marca: #006cb7, #2e3092, #00aeef. Teléfono +57 300 725 7266. Correo claudia@montes-a.com.",
  "Tono: cercano, profesional, claro; sin promesas de resultados ni lenguaje aggressivo.",
  "REGLA 1: uses fotos reales del despacho; nunca inventes casos ni datos.",
  "REGLA 2: nada se publica sin aprobación en la base de datos; entrega el contenido como PROPUESTA.",
  "REGLA 3: nunca pidas ni uses datos de clientes (cédulas, correos, teléfonos).",
  "Responde en texto plano con párrafos cortos y, si encaja, listas numeradas.",
].join("\n");

const ENUNCIADOS: Record<Pestana, string> = {
  chat: "Contesta la petición del administrador y termina con ideas o prompts que puedan servir para próximas publicaciones.",
  biblioteca:
    "Estás en la Biblioteca: devuelve contenido listo para guardar (publicaciones, guiones, notas), con título y cuerpo.",
  estilo:
    "Estás en Estilo de redes: devuelve pautas de estilo (tono, hashtags, extensión, horarios) coherentes con la marca.",
};

/** Convierte el historial al formato del motor. */
export function armarMensajes(
  historial: Mensaje[],
  pestana: Pestana,
  extra?: string
): { role: string; content: string }[] {
  const sistema = CONTEXTO_MARCA + "\n" + ENUNCIADOS[pestana] + (extra ? "\n" + extra : "");
  return [
    { role: "system", content: sistema },
    ...historial.slice(-14).map((m) => ({
      role: m.rol === "usuario" ? "user" : "assistant",
      content: m.texto,
    })),
  ];
}

/**
 * Pregunta al motor de IA.
 * `signal` permite cancelar; si la red falla devuelve un texto de
 * respaldo para que el panel nunca se quede en blanco.
 */
export async function preguntarIA(
  historial: Mensaje[],
  pestana: Pestana,
  extra?: string,
  signal?: AbortSignal
): Promise<string> {
  const mensajes = armarMensajes(historial, pestana, extra);
  try {
    const respuesta = await fetch(URL_IA, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: mensajes }), // el modelo lo fija el servidor
      signal,
    });
    if (!respuesta.ok) throw new Error("HTTP " + respuesta.status);
    const datos = await respuesta.json();
    const texto =
      (typeof datos?.choices?.[0]?.message?.content === "string"
        ? datos.choices[0].message.content
        : "") || "";
    if (!texto.trim()) throw new Error("respuesta vacía");
    return texto.trim();
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
    return [
      "⚠️ No pude conectar con el motor de IA en este momento.",
      "",
      "Puedes reintentar en unos segundos. Mientras tanto, el historial de esta conversación queda guardado.",
      "",
      "Detalle técnico: " + (error as Error).message,
    ].join("\n");
  }
}
