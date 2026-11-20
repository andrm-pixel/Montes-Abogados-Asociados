/* =============================================================
   APRENDIZAJE: IDEAS Y PROMPTS QUE PROPONE EL AGENTE
   -------------------------------------------------------------
   Extrae del bloque IDEAS las sugerencias, las guarda en el
   historial de aprendizaje y deja que el administrador marque
   cuáles le sirven: con eso el agente afina sus propuestas.
   ============================================================= */

import type { Idea } from "./tipos";
import { nuevoId } from "./tipos";
import { cargarIdeas, guardarIdeas } from "./servicioConversaciones";

/** Separa el bloque IDEAS (o LISTA) del texto del asistente. */
export function extraerIdeas(texto: string): string[] {
  const coincidencia = texto.match(/IDEAS[:\s]*([\s\S]+)$/i);
  const cuerpo = coincidencia ? coincidencia[1] : "";
  if (!cuerpo) return [];
  return cuerpo
    .split(/\n/)
    .map((linea) => linea.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim())
    .filter((linea) => linea.length > 8 && linea.length < 240)
    .slice(0, 5);
}

/** Convierte el bloque de ideas en registros del aprendizaje. */
export function registrarIdeas(texto: string): Idea[] {
  const nuevas = extraerIdeas(texto).map<Idea>((linea) => ({
    id: nuevoId(),
    tipo: /^\s*(?:prompt|usa|instrucci)/i.test(linea) ? "prompt" : "idea",
    texto: linea,
    util: null,
    vecesUsado: 0,
    creadoEn: Date.now(),
  }));
  if (!nuevas.length) return [];
  const previas = cargarIdeas();
  // Evita duplicados (mismo texto ya aprendido).
  const conocidas = new Set(previas.map((i) => i.texto.toLowerCase()));
  const lista = [...previas, ...nuevas.filter((i) => !conocidas.has(i.texto.toLowerCase()))];
  guardarIdeas(lista.slice(-60));
  return lista;
}

/** El admin marca una idea como útil (👍) o la descarta (👎). */
export function valorarIdea(id: string, util: boolean): Idea[] {
  const lista = cargarIdeas().map((i) => (i.id === id ? { ...i, util } : i));
  guardarIdeas(lista);
  return lista;
}

/** Marca una idea como usada (se insertó en la caja de texto). */
export function marcarUso(id: string): Idea[] {
  const lista = cargarIdeas().map((i) =>
    i.id === id ? { ...i, vecesUsado: i.vecesUsado + 1, util: i.util === null ? true : i.util } : i
  );
  guardarIdeas(lista);
  return lista;
}

/**
 * Devuelve el contexto con lo aprendido para inyectarlo en la
 * siguiente pregunta (así el agente "aprende" de la conversación).
 */
export function contextoAprendido(limite = 6): string {
  const utiles = cargarIdeas()
    .filter((i) => i.util !== false)
    .sort((a, b) => b.vecesUsado - a.vecesUsado)
    .slice(0, limite);
  if (!utiles.length) return "";
  return (
    "IDEAS QUE AL ADMINISTRADOR LE HAN SERVIDO (úsalas como referencia de estilo):\n" +
    utiles.map((i) => "- " + i.texto).join("\n")
  );
}
