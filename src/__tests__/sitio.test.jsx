import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, waitFor, fireEvent } from "@testing-library/react";
import PaginaSitio from "../componentes/PaginaSitio.jsx";

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

  it("cambia a inglés con el botón de bandera", async () => {
    const { container } = render(<PaginaSitio pagina="pagina-montes.html" />);
    await waitFor(() => expect(container.querySelector('[data-idioma="en"]')).not.toBeNull());
    fireEvent.click(container.querySelector('[data-idioma="en"]'));
    expect(document.documentElement.lang).toBe("en");
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
});
