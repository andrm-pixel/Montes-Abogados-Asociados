import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor, fireEvent } from "@testing-library/react";

/* El sitio con "servidor": se reemplaza el módulo de cuentas para ver
   qué le pide el formulario a la base, sin tocar Supabase de verdad. */
const api = vi.hoisted(() => ({
  enviarSolicitud: vi.fn(),
  suscribirBoletin: vi.fn(() => Promise.resolve({ ok: true })),
}));

vi.mock("./src/lib/cuentas.js", () => ({
  hayBackend: () => true,
  llegoPorRecuperacion: () => false,
  perfilActual: () => Promise.resolve(null),
  alCambiarSesion: () => () => {},
  registrar: vi.fn(),
  entrar: vi.fn(),
  salir: vi.fn(() => Promise.resolve({ ok: true })),
  pedirRecuperacion: vi.fn(),
  actualizarClave: vi.fn(),
  misSolicitudes: () => Promise.resolve({ ok: true, solicitudes: [] }),
  enviarSolicitud: api.enviarSolicitud,
  suscribirBoletin: api.suscribirBoletin,
  ETIQUETA_ESTADO: { es: {}, en: {} },
}));

import PaginaSitio from "./PaginaSitio.jsx";

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = "";
  window.fetch = vi.fn(() => Promise.resolve({ ok: true, text: async () => '{"success":"true"}', json: async () => null }));
  api.enviarSolicitud.mockReset();
});

async function llenarFormulario(container, area = "cartera") {
  await waitFor(() => expect(container.querySelector("#formulario")).not.toBeNull());
  const set = (id, v) => { container.querySelector("#" + id).value = v; };
  set("nombre", "Ana"); set("apellido", "Pérez"); set("correo", "ana@ejemplo.com");
  set("telefono", "3001234567"); set("mensaje", "Quiero una consulta"); set("area", area);
  container.querySelector("#privacidad").checked = true;
}

describe("formulario de contacto con servidor", () => {
  it("guarda la solicitud en la base y no la deja en el navegador", async () => {
    api.enviarSolicitud.mockResolvedValue({ ok: true, codigo: "MAA-000001" });
    const { container } = render(<PaginaSitio pagina="contacto.html" />);
    await llenarFormulario(container);
    fireEvent.submit(container.querySelector("#formulario"));

    await waitFor(() => expect(api.enviarSolicitud).toHaveBeenCalledTimes(1));
    expect(api.enviarSolicitud).toHaveBeenCalledWith(expect.objectContaining({
      nombre: "Ana", apellido: "Pérez", correo: "ana@ejemplo.com", area: "cartera",
      version: "22 de octubre de 2026",
    }));
    await waitFor(() => expect(container.querySelector("#mensajeEnviado").textContent).toMatch(/Gracias Ana/));
    expect(localStorage.getItem("solicitudesMontes")).toBeNull();
    expect(localStorage.getItem("pruebasAutorizacionMontes")).toBeNull();
  });

  it("manda además el correo de aviso, pero no depende de él", async () => {
    api.enviarSolicitud.mockResolvedValue({ ok: true, codigo: "MAA-000002" });
    window.fetch = vi.fn(() => Promise.reject(new Error("sin red")));
    const { container } = render(<PaginaSitio pagina="contacto.html" />);
    await llenarFormulario(container, "laboral");
    fireEvent.submit(container.querySelector("#formulario"));

    await waitFor(() => expect(container.querySelector("#mensajeEnviado").textContent).toMatch(/Gracias Ana/));
    expect(window.fetch.mock.calls.some(([u]) => /formsubmit/.test(String(u)))).toBe(true);
  });

  it("si la base rechaza la solicitud, no agradece", async () => {
    api.enviarSolicitud.mockResolvedValue({ ok: false, codigo: "red" });
    const { container } = render(<PaginaSitio pagina="contacto.html" />);
    await llenarFormulario(container);
    fireEvent.submit(container.querySelector("#formulario"));

    await waitFor(() => expect(container.querySelector("#mensajeEnviado").textContent).toMatch(/No pudimos enviar/));
    expect(container.querySelector("#mensajeEnviado").textContent).not.toMatch(/Gracias/);
  });

  it("avisa cuando se superó el límite de solicitudes por hora", async () => {
    api.enviarSolicitud.mockResolvedValue({ ok: false, codigo: "limite" });
    const { container } = render(<PaginaSitio pagina="contacto.html" />);
    await llenarFormulario(container);
    fireEvent.submit(container.querySelector("#formulario"));

    await waitFor(() => expect(container.querySelector("#mensajeEnviado").textContent).toMatch(/varias solicitudes seguidas/));
  });
});
