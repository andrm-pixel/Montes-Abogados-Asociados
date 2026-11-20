/* =============================================================
   HILO DE IA (Web Worker)
   -------------------------------------------------------------
   Este archivo corre en su propio hilo: recibe una petición y
   hace la llamada al motor de IA sin ocupar la interfaz.
   ============================================================= */

import type { Mensaje, Pestana } from "./tipos";
import { preguntarIA } from "./servicioIA";

interface Entrada {
  id: string;
  historial: Mensaje[];
  pestana: Pestana;
  extra?: string;
}

const contexto = self as unknown as {
  onmessage: ((evento: MessageEvent<Entrada>) => void) | null;
};

contexto.onmessage = async (evento: MessageEvent<Entrada>) => {
  const peticion = evento.data;
  try {
    const texto = await preguntarIA(peticion.historial, peticion.pestana, peticion.extra);
    (self as unknown as Worker).postMessage({ id: peticion.id, texto });
  } catch (error) {
    (self as unknown as Worker).postMessage({
      id: peticion.id,
      texto: "⚠️ Falló el hilo de IA: " + (error as Error).message,
    });
  }
};
