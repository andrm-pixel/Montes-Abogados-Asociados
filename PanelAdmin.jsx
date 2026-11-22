import { useEffect } from "react";
import cuerpo from "./admin-cuerpo.html?raw";
import { iniciarAdmin } from "./admin.js";
import { ChatAgente } from "./src/agente";

/* Panel del administrador: React monta su marcado y luego activa su lógica.
   Al final se añade el asistente de IA (chat con historial, ideas y
   propuestas pendientes de aprobación). */
export default function PanelAdmin() {
  useEffect(() => {
    document.body.classList.add("modo-admin");
    iniciarAdmin();
    return () => document.body.classList.remove("modo-admin");
  }, []);
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: cuerpo }} />
      <ChatAgente />
    </>
  );
}
