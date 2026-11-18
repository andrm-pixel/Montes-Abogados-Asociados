import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, waitFor, fireEvent } from "@testing-library/react";
import PanelAdmin from "./PanelAdmin.jsx";
import { reiniciarDatos } from "./admin.js";

/* Responde "no hay nada" a toda la red: sin datos.json y sin
   servicio de traduccion. Asi las pruebas no dependen de internet. */
function sinRed() {
  vi.stubGlobal("fetch", vi.fn(() =>
    Promise.resolve({ ok: false, json: async () => null })
  ));
}

/* Ademas de no tener datos.json, contesta la traduccion devolviendo
   "EN: " seguido del texto en espanol, para poder comprobar que el
   panel la usa. */
function conTraduccion() {
  vi.stubGlobal("fetch", vi.fn((url) => {
    const u = String(url);
    if (u.includes("datos.json")) {
      return Promise.resolve({ ok: false, json: async () => null });
    }
    if (u.includes("translate.googleapis.com")) {
      const q = decodeURIComponent(u.split("q=")[1] || "");
      return Promise.resolve({ ok: true, json: async () => [[[ "EN:" + q ]]] });
    }
    return Promise.resolve({ ok: false, json: async () => null });
  }));
}

function entrarAlPanel(container) {
  container.querySelector("#usuario").value = "admin";
  container.querySelector("#clave").value = "montes2026";
  fireEvent.click(container.querySelector("#btnEntrar"));
}

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = "";
  reiniciarDatos();  // cada prueba empieza con los datos de fabrica
  sinRed();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("panel de administración", () => {
  it("entra, agrega una diapositiva del carrusel y la guarda", async () => {
    const { container } = render(<PanelAdmin />);
    await waitFor(() => expect(container.querySelector("#btnEntrar")).not.toBeNull());

    entrarAlPanel(container);

    await waitFor(() => expect(container.querySelector("#listaCarrusel")).not.toBeNull());
    fireEvent.click(container.querySelector("#btnAgregarDiapositiva"));
    await waitFor(() => expect(container.querySelector("#carTitulo0")).not.toBeNull());
    container.querySelector("#carTitulo0").value = "Titulo desde React";
    fireEvent.click(container.querySelector("#btnGuardar"));

    const guardado = JSON.parse(localStorage.getItem("datosMontesSitio"));
    expect(guardado.carrusel.length).toBe(1);
    expect(guardado.carrusel[0].titulo).toBe("Titulo desde React");
  });

  it("guardar nunca borra el carrusel, aunque se guarde sin entrar", async () => {
    const { container } = render(<PanelAdmin />);
    await waitFor(() => expect(container.querySelector("#btnGuardar")).not.toBeNull());

    // Se guarda sin haber iniciado sesion: el carrusel debe quedar
    // como lista (vacia) y no desaparecer.
    fireEvent.click(container.querySelector("#btnGuardar"));

    const guardado = JSON.parse(localStorage.getItem("datosMontesSitio"));
    expect(Array.isArray(guardado.carrusel)).toBe(true);
    expect(guardado.carrusel.length).toBe(0);
  });

  it("muestra todos los botones de archivos en español", async () => {
    const { container } = render(<PanelAdmin />);
    await waitFor(() => expect(container.querySelector("#btnEntrar")).not.toBeNull());
    entrarAlPanel(container);
    await waitFor(() => expect(container.querySelector("#listaPublicaciones .item")).not.toBeNull());

    // Como no hay datos.json en la prueba, se agrega una imagen para
    // revisar los campos y botones del carrusel.
    fireEvent.click(container.querySelector("#btnAgregarDiapositiva"));
    await waitFor(() => expect(container.querySelector("#carTitulo0")).not.toBeNull());

    const etiquetas = Array.from(container.querySelectorAll("label.boton-archivo"))
      .map((etiqueta) => etiqueta.textContent.trim());

    // Carrusel, publicaciones e imagen de cada una.
    expect(etiquetas).toContain("Agregar imagen");
    expect(etiquetas).toContain("Agregar archivo o documento");
    expect(etiquetas).toContain("Agregar logotipo");
    expect(container.querySelector("#btnAgregarDiapositiva").textContent.trim())
      .toBe("Agregar imagen nueva");

    // Cada imagen del carrusel tiene su titulo, su subtitulo y su boton de quitar.
    const primera = container.querySelector("#listaCarrusel .item, #listaCarrusel > div");
    expect(container.querySelector("#carTitulo0")).not.toBeNull();
    expect(container.querySelector("#carTexto0")).not.toBeNull();
    expect(container.querySelector("#listaCarrusel").textContent).toContain("Quitar imagen");
    expect(primera || container.querySelector("#listaCarrusel")).not.toBeNull();
  });

  it("la imagen del carrusel se cambia con un botón que dice Cambiar imagen", async () => {
    const { container } = render(<PanelAdmin />);
    await waitFor(() => expect(container.querySelector("#btnEntrar")).not.toBeNull());
    entrarAlPanel(container);
    await waitFor(() => expect(container.querySelector("#btnAgregarDiapositiva")).not.toBeNull());

    fireEvent.click(container.querySelector("#btnAgregarDiapositiva"));
    await waitFor(() => expect(container.querySelector("#carImagen0")).not.toBeNull());

    const etiqueta = container.querySelector('label[for="carImagen0"]');
    expect(etiqueta).not.toBeNull();
    expect(etiqueta.textContent.trim()).toBe("Cambiar imagen");
    expect(etiqueta.classList.contains("boton-archivo")).toBe(true);

    // El campo de archivo sigue ahí, pero es el que queda oculto
    // tras el botón: el usuario nunca ve el cuadrito del navegador.
    expect(container.querySelector("#carImagen0").type).toBe("file");
  });

  it("traduce el título en español al inglés solo y respeta lo escrito a mano", async () => {
    conTraduccion();
    const { container } = render(<PanelAdmin />);
    await waitFor(() => expect(container.querySelector("#btnEntrar")).not.toBeNull());
    entrarAlPanel(container);
    await waitFor(() => expect(container.querySelector("#btnAgregarDiapositiva")).not.toBeNull());

    fireEvent.click(container.querySelector("#btnAgregarDiapositiva"));
    await waitFor(() => expect(container.querySelector("#carTitulo0")).not.toBeNull());

    // La imagen nueva nace con el titulo ya traducido.
    await waitFor(() =>
      expect(container.querySelector("#carTituloEn0").value).toBe("EN:Nueva diapositiva")
    );

    // Al cambiar el titulo en espanol, la traduccion se actualiza sola.
    container.querySelector("#carTitulo0").value = "Hola mundo";
    fireEvent.blur(container.querySelector("#carTitulo0"));
    await waitFor(() =>
      expect(container.querySelector("#carTituloEn0").value).toBe("EN:Hola mundo")
    );

    // Si el usuario escribe el ingles a mano, ya no se toca.
    container.querySelector("#carTituloEn0").value = "Manual English";
    fireEvent.input(container.querySelector("#carTituloEn0"));
    container.querySelector("#carTitulo0").value = "Otro texto";
    fireEvent.blur(container.querySelector("#carTitulo0"));
    await new Promise((r) => setTimeout(r, 30));
    expect(container.querySelector("#carTituloEn0").value).toBe("Manual English");
  });
});
