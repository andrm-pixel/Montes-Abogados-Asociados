import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// jsdom no implementa matchMedia; el sitio lo usa para "reducir movimiento".
window.matchMedia = window.matchMedia || (() => ({
  matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}
}));
window.scrollTo = () => {};

// Testing Library no se limpia solo cuando Vitest corre sin "globals".
// Sin esto, cada prueba deja su página en el documento y la siguiente
// encuentra varios #formulario: el sitio engancha sus eventos al primero
// (que es de otra prueba) y las pruebas dejan de probar lo que dicen.
afterEach(() => {
  cleanup();
});
