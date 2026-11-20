/* =============================================================
   HILOS DE CONCURRENCIA
   -------------------------------------------------------------
   Ejecuta varias peticiones a la IA en paralelo, cada una en su
   propio hilo (Web Worker). Si el navegador o el entorno de
   pruebas no tiene Workers, hace los mismos trabajos en paralelo
   con promesas: la interfaz nunca se bloquea.
   ============================================================= */

import type { Mensaje, Pestana } from "./tipos";
import { preguntarIA } from "./servicioIA";

export interface Peticion {
  id: string;
  historial: Mensaje[];
  pestana: Pestana;
  extra?: string;
}

export type MapaResultados = Map<string, string>;

const ANCHO_POR_DEFECTO = 3;

/** Crea un hilo de IA; devuelve null si el entorno no lo admite. */
function crearHilo(): Worker | null {
  if (typeof Worker === "undefined") return null;
  try {
    return new Worker(new URL("./workerIA.ts", import.meta.url), { type: "module" });
  } catch {
    return null;
  }
}

/** Versión sin hilos: corre todo en paralelo con promesas. */
async function sinHilos(peticiones: Peticion[]): Promise<MapaResultados> {
  const respuestas = await Promise.all(
    peticiones.map((p) =>
      preguntarIA(p.historial, p.pestana, p.extra).catch(
        (error: Error) => "⚠️ No se pudo completar la tarea: " + error.message
      )
    )
  );
  const mapa: MapaResultados = new Map();
  peticiones.forEach((p, i) => mapa.set(p.id, respuestas[i]));
  return mapa;
}

/**
 * Ejecuta todas las peticiones en un grupo de hilos y devuelve un
 * mapa id → texto, sin importar el orden en que terminen.
 */
export async function ejecutarEnHilos(
  peticiones: Peticion[],
  ancho: number = ANCHO_POR_DEFECTO
): Promise<MapaResultados> {
  if (peticiones.length === 0) return new Map();

  const primerHilo = crearHilo();
  if (!primerHilo) return sinHilos(peticiones);

  const hilos: Worker[] = [primerHilo];
  for (let i = 1; i < Math.min(ancho, peticiones.length); i++) {
    const extra = crearHilo();
    if (extra) hilos.push(extra);
  }

  const resultados: MapaResultados = new Map();
  const cola: Peticion[] = [...peticiones];
  const ocupados = new Set<Worker>();

  let alTerminar: (() => void) | null = null;
  const terminar = () => alTerminar?.();

  const repartir = () => {
    for (const worker of hilos) {
      if (cola.length === 0) break;
      if (ocupados.has(worker)) continue;
      const peticion = cola.shift();
      if (!peticion) break;
      ocupados.add(worker);
      worker.postMessage(peticion);
    }
    if (cola.length === 0 && ocupados.size === 0) terminar();
  };

  const atender = (worker: Worker, evento: MessageEvent) => {
    const datos = (evento.data ?? {}) as { id?: string; texto?: string };
    if (datos.id) {
      resultados.set(datos.id, datos.texto || "⚠️ El hilo no devolvió respuesta.");
    }
    ocupados.delete(worker);
    repartir();
  };

  // Si un hilo muere, se libera su espacio y se reintenta después
  // en el hilo principal para no dejar la conversación a medias.
  const fallo = (worker: Worker) => {
    ocupados.delete(worker);
    repartir();
  };

  await new Promise<void>((resolver) => {
    alTerminar = resolver;
    for (const worker of hilos) {
      worker.addEventListener("message", (e) => atender(worker, e as MessageEvent));
      worker.addEventListener("error", () => fallo(worker));
    }
    repartir();
  });

  for (const worker of hilos) worker.terminate();

  const pendientes = peticiones.filter((p) => !resultados.has(p.id));
  if (pendientes.length) {
    const respuestas = await sinHilos(pendientes);
    respuestas.forEach((texto, id) => resultados.set(id, texto));
  }

  return resultados;
}

/** Ejecuta respuesta principal + ideas en dos hilos y devuelve ambos textos. */
export async function responderConIdeas(
  historial: Mensaje[],
  pestana: Pestana,
  contexto?: string
): Promise<{ respuesta: string; ideas: string }> {
  const peticiones: Peticion[] = [
    { id: "respuesta", historial, pestana, extra: contexto },
    {
      id: "ideas",
      historial,
      pestana,
      extra:
        (contexto ? contexto + "\n" : "") +
        "Además, en un bloque aparte titulado IDEAS, escribe 3 ideas y 2 prompts concretos " +
        "para próximas publicaciones de la firma (redes, video o actualidad).",
    },
  ];
  const mapa = await ejecutarEnHilos(peticiones, 2);
  return {
    respuesta: mapa.get("respuesta") || "⚠️ Sin respuesta del motor de IA.",
    ideas: mapa.get("ideas") || "",
  };
}
