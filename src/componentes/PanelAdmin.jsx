import { useEffect } from "react";
import cuerpo from "../paginas/admin-cuerpo.html?raw";
import { iniciarAdmin } from "../legacy/admin.js";

/* Panel del administrador: React monta su marcado y luego activa su lógica. */
export default function PanelAdmin() {
  useEffect(() => {
    iniciarAdmin();
  }, []);
  return <div dangerouslySetInnerHTML={{ __html: cuerpo }} />;
}
