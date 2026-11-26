// Convierte la respuesta de generar-prompt-video en mensajes del chat: uno por cada parte de 15 s,
// para que se pueda copiar cada prompt por separado ("este es el video 1", "esta es la continuación").
import type { ParteVideo } from "./pedidoVideo";

export interface VideoRespuesta {
  numero: number;
  duracion_seg: number;
  total_partes: number;
  guion: string;
  partes: ParteVideo[];
  texto_redes: string;
  notas_revision: string;
}

/** Texto completo de un video, para mandarlo como "borrador" cuando se pide un ajuste. */
export function textoDeVideo(v: VideoRespuesta): string {
  return [v.guion, ...v.partes.map((p) => p.texto), "TEXTO PARA REDES\n" + v.texto_redes].join("\n\n");
}

/** Los mensajes que el asistente escribe en el chat, en orden. */
export function mensajesDeVideos(videos: VideoRespuesta[]): string[] {
  const salida: string[] = [];
  for (const v of videos) {
    const partes = v.total_partes + (v.total_partes > 1 ? " partes" : " parte") + " de 15 s";
    salida.push("🎬 VIDEO " + v.numero + " · " + v.duracion_seg + " s · " + partes + "\n\nGUION\n" + v.guion);
    for (const p of v.partes) salida.push(p.texto);
    salida.push(
      "TEXTO PARA REDES (video " + v.numero + ")\n" + (v.texto_redes || "—") +
        (v.notas_revision ? "\n\nNOTAS DE REVISIÓN\n" + v.notas_revision : "")
    );
  }
  salida.push(
    "Quedó en Pendientes de aprobación (" + videos.length + (videos.length > 1 ? " videos" : " video") + ").\n\n" +
      "¿Quieres cambiar algo? Escribe el ajuste" + (videos.length > 1 ? " empezando por el número, por ejemplo «video 2: más formal»" : " (tono, una escena, el cierre)") +
      ". También puedes pedir otra duración («hazlo de 30 segundos»). Para un tema nuevo escribe otro pedido, por ejemplo «2 videos de 1 minuto sobre nuestros servicios»."
  );
  return salida;
}
