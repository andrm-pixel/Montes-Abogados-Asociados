/* Salida pública del módulo del asistente de IA. */
export { default as ChatAgente } from "./ChatAgente";
export { useChatAgente } from "./useChatAgente";
export * from "./tipos";
export { filtrarDatosPersonales, avisoFiltrado } from "./seguridad";
export { extraerIdeas, contextoAprendido } from "./aprendizaje";
export { ejecutarEnHilos, responderConIdeas } from "./concurrencia";
export {
  cargarConversaciones,
  guardarConversaciones,
  cargarPropuestas,
  guardarPropuestas,
  haySupabase,
} from "./servicioConversaciones";
