import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, waitFor, fireEvent } from "@testing-library/react";
import PaginaSitio from "./PaginaSitio.jsx";

const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.lang = "es";
  window.fetch = vi.fn(() => Promise.resolve({ ok: false, json: async () => null, text: async () => "" }));
});

describe("página de inicio", () => {
  it("sin imágenes en el carrusel no lo muestra", async () => {
    const { container } = render(<PaginaSitio pagina="pagina-montes.html" />);
    await waitFor(() => expect(container.querySelector(".banner")).not.toBeNull());
    expect(container.querySelector("#carrusel")).toBeNull();
  });

  it("muestra solo las diapositivas con imagen y navega con los puntos", async () => {
    localStorage.setItem("datosMontesSitio", JSON.stringify({
      carrusel: [
        { imagen: PNG, titulo: "Primera", texto: "Uno", tituloEn: "First", textoEn: "One", enlace: "contacto.html" },
        { imagen: PNG, titulo: "Segunda", texto: "Dos", enlace: "javascript:alert(1)" },
        { imagen: "", titulo: "Sin imagen", texto: "no debe salir" },
      ],
    }));
    const { container } = render(<PaginaSitio pagina="pagina-montes.html" />);
    await waitFor(() => expect(container.querySelector("#carrusel")).not.toBeNull());
    const diapos = container.querySelectorAll(".carrusel-diapositiva");
    expect(diapos.length).toBe(2);
    expect(diapos[0].classList.contains("activa")).toBe(true);
    expect(container.querySelector(".carrusel-boton").getAttribute("href")).toBe("contacto.html");
    expect(container.innerHTML).not.toContain("javascript:");
    fireEvent.click(container.querySelectorAll(".carrusel-punto")[1]);
    expect(container.querySelectorAll(".carrusel-diapositiva")[1].classList.contains("activa")).toBe(true);
  });

  it("una diapositiva sin título, subtítulo ni enlace sale sola, sin recuadro", async () => {
    // Así quedó el carrusel con las 3 imágenes de la firma: dos con
    // descripción y una en blanco, que debe verse solo la foto.
    localStorage.setItem("datosMontesSitio", JSON.stringify({
      carrusel: [
        { imagen: PNG, titulo: "Compromiso con sus clientes", texto: "Asesoría legal cercana", tituloEn: "Commitment", textoEn: "Close support", enlace: "" },
        { imagen: PNG, titulo: "", texto: "", tituloEn: "", textoEn: "", enlace: "" },
      ],
    }));
    const { container } = render(<PaginaSitio pagina="pagina-montes.html" />);
    await waitFor(() => expect(container.querySelector("#carrusel")).not.toBeNull());

    const diapos = container.querySelectorAll(".carrusel-diapositiva");
    expect(diapos.length).toBe(2);

    // La que sí tiene texto lleva su recuadro con el título.
    expect(diapos[0].querySelector("figcaption")).not.toBeNull();
    expect(diapos[0].querySelector("figcaption").textContent).toContain("Compromiso con sus clientes");

    // La vacía queda solo con la imagen: sin recuadro y sin título.
    expect(diapos[1].querySelector("figcaption")).toBeNull();
    expect(diapos[1].querySelector("img").getAttribute("alt")).toBe("");
  });

  it("cambia a inglés con el botón de bandera", async () => {
    const { container } = render(<PaginaSitio pagina="pagina-montes.html" />);
    await waitFor(() => expect(container.querySelector('[data-idioma="en"]')).not.toBeNull());
    fireEvent.click(container.querySelector('[data-idioma="en"]'));
    expect(document.documentElement.lang).toBe("en");
  });

  it("usa la traducción automática que guardó el panel en la versión en inglés", async () => {
    // Así queda el navegador después de que el panel guarda y traduce.
    // Se mira en areas.html, porque ahí vive la sección de servicios
    // (el inicio ya no la muestra).
    localStorage.setItem("datosMontesSitio", JSON.stringify({
      servicios: [{ titulo: "Derecho Comercial y Contratos", texto: "Texto actualizado desde el panel." }],
      traducciones: {
        "servicios.0.titulo": { es: "Derecho Comercial y Contratos", en: "Commercial Contracts Law" },
      },
    }));

    const { container } = render(<PaginaSitio pagina="areas.html" />);
    const titulo = () => container.querySelector('[data-i18n="servicios.0.titulo"]');
    await waitFor(() => expect(titulo()).not.toBeNull());

    // En español se ve el texto del panel.
    expect(titulo().textContent).toBe("Derecho Comercial y Contratos");

    // En inglés se ve la traducción automática.
    fireEvent.click(container.querySelector('[data-idioma="en"]'));
    expect(titulo().textContent).toBe("Commercial Contracts Law");

    // Y al volver al español, el texto original.
    fireEvent.click(container.querySelector('[data-idioma="es"]'));
    expect(titulo().textContent).toBe("Derecho Comercial y Contratos");
  });
});

describe("formulario de contacto", () => {
  it("envía una sola vez al endpoint AJAX con asunto y respuesta al visitante", async () => {
    const { container } = render(<PaginaSitio pagina="contacto.html" />);
    await waitFor(() => expect(container.querySelector("#formulario")).not.toBeNull());
    const set = (id, v) => { container.querySelector("#" + id).value = v; };
    set("nombre", "Ana"); set("apellido", "Pérez"); set("correo", "ana@ejemplo.com");
    set("telefono", "3001234567"); set("mensaje", "Quiero una consulta"); set("area", "comercial");
    container.querySelector("#privacidad").checked = true;
    window.fetch.mockClear();
    window.fetch.mockImplementation(() => Promise.resolve({ ok: true, text: async () => '{"success":"true"}' }));
    fireEvent.submit(container.querySelector("#formulario"));
    await waitFor(() => expect(window.fetch).toHaveBeenCalled());
    const envios = window.fetch.mock.calls.filter(([u]) => /formsubmit/.test(u));
    expect(envios.length).toBe(1);
    expect(envios[0][0]).toBe("https://formsubmit.co/ajax/claudia@montes-a.com");
    const fd = envios[0][1].body;
    expect(fd.get("_subject")).toBe("Nueva consulta - Montes Abogados Asociados");
    expect(fd.get("_replyto")).toBe("ana@ejemplo.com");
  });

  it("con error del servidor no muestra el mensaje de enviado", async () => {
    const { container } = render(<PaginaSitio pagina="contacto.html" />);
    await waitFor(() => expect(container.querySelector("#formulario")).not.toBeNull());
    const set = (id, v) => { container.querySelector("#" + id).value = v; };
    set("nombre", "Ana"); set("apellido", "Pérez"); set("correo", "ana@ejemplo.com");
    set("mensaje", "x"); set("area", "comercial");
    container.querySelector("#privacidad").checked = true;
    window.fetch.mockImplementation(() => Promise.resolve({ ok: false, status: 500, text: async () => "" }));
    fireEvent.submit(container.querySelector("#formulario"));
    await waitFor(() => expect(window.fetch).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 50));
    expect(container.querySelector("#mensajeEnviado")?.textContent || "").not.toMatch(/Gracias/);
  });

  it("si el servicio responde success:\"false\" (como texto) no agradece el envío", async () => {
    // Así contesta FormSubmit cuando el formulario aún no está activado:
    // HTTP 200 con {"success":"false"}. La página no debe mostrar "Gracias".
    const { container } = render(<PaginaSitio pagina="contacto.html" />);
    await waitFor(() => expect(container.querySelector("#formulario")).not.toBeNull());
    const set = (id, v) => { container.querySelector("#" + id).value = v; };
    set("nombre", "Ana"); set("apellido", "Pérez"); set("correo", "ana@ejemplo.com");
    set("mensaje", "x"); set("area", "comercial");
    container.querySelector("#privacidad").checked = true;
    window.fetch.mockImplementation(() => Promise.resolve({
      ok: true,
      status: 200,
      text: async () => '{"success":"false","message":"This form needs Activation."}'
    }));
    fireEvent.submit(container.querySelector("#formulario"));
    await waitFor(() => expect(window.fetch).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 50));
    const aviso = container.querySelector("#mensajeEnviado")?.textContent || "";
    expect(aviso).not.toMatch(/Gracias/);
    expect(aviso).toMatch(/No pudimos enviar/);
  });

  it("rechaza un correo sin punto o sin algo después del punto", async () => {
    // Regla pedida: el correo debe tener @, algo después del @,
    // al menos un punto y algo después de ese punto.
    const { container } = render(<PaginaSitio pagina="contacto.html" />);
    await waitFor(() => expect(container.querySelector("#formulario")).not.toBeNull());
    const set = (id, v) => { container.querySelector("#" + id).value = v; };
    set("nombre", "Ana"); set("apellido", "Pérez");
    set("mensaje", "x"); set("area", "comercial");
    container.querySelector("#privacidad").checked = true;
    window.fetch.mockClear();

    const malos = ["ana@correo", "ana@.com", "ana@mail.", "@mail.com"];
    for (const correo of malos) {
      set("correo", correo);
      fireEvent.submit(container.querySelector("#formulario"));
      await new Promise((r) => setTimeout(r, 50));
      const aFormsubmit = window.fetch.mock.calls.filter(([u]) => /formsubmit/.test(String(u)));
      expect(aFormsubmit.length).toBe(0);
      expect(container.querySelector("#correo")?.className || "").toMatch(/campo-error/);
      container.querySelector("#correo").classList.remove("campo-error");
    }
  });
});
