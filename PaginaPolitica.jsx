import { useEffect } from "react";
import cuerpo from "./politica-cuerpo.html?raw";
import { iniciarPolitica } from "./politica.js";

/* Política de tratamiento de datos: marcado estático + su script de tema/idioma. */
export default function PaginaPolitica() {
  useEffect(() => {
    iniciarPolitica();
  }, []);
  return <div id="app" dangerouslySetInnerHTML={{ __html: cuerpo }} />;
}
