/* =============================================================
   TIPOS DEL AGENTE DE IA
   -------------------------------------------------------------
   Un solo lugar con todas las formas de los datos que viajan
   entre el chat, el historial y Supabase.
   ============================================================= */

/** Quién habla en la conversación. */
export type Rol = "usuario" | "asistente";

/** Las tres pestañas del asistente (como en el panel de Fresura). */
export type Pestana = "chat" | "biblioteca" | "estilo";

/** Un mensaje del chat. */
export interface Mensaje {
  id: string;
  rol: Rol;
  texto: string;
  creadoEn: number;
}

/** Una conversación completa con su historial. */
export interface Conversacion {
  id: string;
  titulo: string;
  pestana: Pestana;
  mensajes: Mensaje[];
  creadaEn: number;
  actualizadaEn: number;
}

/** Estado de una propuesta de contenido: nada se publica solo. */
export type EstadoPropuesta = "pendiente" | "aprobada" | "rechazada";

export interface Propuesta {
  id: string;
  texto: string;
  tipo: "post" | "video" | "guion" | "carrusel";
  estado: EstadoPropuesta;
  destino?: string;
  creadoEn: number;
}

/** Idea o prompt que el agente propone y el admin valora. */
export interface Idea {
  id: string;
  tipo: "idea" | "prompt";
  texto: string;
  util: boolean | null;
  vecesUsado: number;
  creadoEn: number;
}

/** Lo que el hilo de IA devuelve. */
export interface ResultadoIA {
  texto: string;
  propuestas: Propuesta[];
}

/** Límite de caracteres por mensaje (indicador 0/2000). */
export const LIMITE_CARACTERES = 2000;

/** Menú numerado del saludo inicial. */
export const MENU_SALUDO: string[] = [
  "Crear una publicación para redes sociales",
  "Sugerir 3 ideas de contenido de la semana",
  "Escribir el guion de un video con el avatar",
  "Redactar una nota de Actualidad Jurídica",
  "Proponer prompts para futuras publicaciones",
  "Explicar qué tengo pendiente de aprobar",
];

/** Aviso de privacidad que siempre acompaña la caja de texto. */
export const AVISO_PRIVACIDAD =
  "Evita incluir datos personales de clientes (cédulas, correos, teléfonos).";

/** Identificador corto y legible (sin dependencias externas). */
export function nuevoId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}
