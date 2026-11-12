import { useEffect, useState } from "react";
import {
  construirPagina, obtenerDatosDelSitio, buscarDatosGuardados, iniciarMenu, iniciarFormulario,
  iniciarSesionUsuario, iniciarControles, iniciarTema, iniciarIdioma, iniciarAnimacionesScroll,
  iniciarCarrusel, detenerCarrusel, mostrarResumenConsola,
} from "../legacy/sitio.js";

/* Página del sitio. El HTML lo genera construirPagina(); React lo inserta en #app
   y después activa menú, idioma, tema, formulario y carrusel. */
export default function PaginaSitio({ pagina }) {
  const [html, setHtml] = useState(null);

  // 1) Leer datos (navegador o datos.json) y generar el marcado.
  useEffect(() => {
    let vigente = true;
    obtenerDatosDelSitio().then((datos) => {
      if (!vigente) return;
      buscarDatosGuardados(datos);
      setHtml(construirPagina(pagina));
    });
    return () => {
      vigente = false;
      detenerCarrusel();
    };
  }, [pagina]);

  // 2) Con el marcado ya en pantalla, activar los controles.
  useEffect(() => {
    if (html === null) return;
    iniciarMenu();
    iniciarFormulario();
    iniciarSesionUsuario();
    iniciarControles();
    iniciarTema();
    iniciarIdioma();
    iniciarAnimacionesScroll();
    iniciarCarrusel();
    mostrarResumenConsola();
  }, [html]);

  return <div id="app" data-pagina={pagina} dangerouslySetInnerHTML={{ __html: html ?? "" }} />;
}
