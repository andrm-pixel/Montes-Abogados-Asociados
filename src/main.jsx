import "./styles/estilos.css";
import { createRoot } from "react-dom/client";
import PaginaSitio from "./componentes/PaginaSitio.jsx";
import PaginaPolitica from "./componentes/PaginaPolitica.jsx";

// Cada página HTML trae <div id="root" data-pagina="..."> y aquí se monta su componente.
const nodo = document.getElementById("root");
const pagina = nodo.dataset.pagina;

createRoot(nodo).render(
  pagina === "politica-datos.html" ? <PaginaPolitica /> : <PaginaSitio pagina={pagina} />
);
