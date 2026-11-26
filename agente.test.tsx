import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import ChatAgente from "./src/agente/ChatAgente";
import { filtrarDatosPersonales, avisoFiltrado } from "./src/agente/seguridad";
import { extraerIdeas } from "./src/agente/aprendizaje";
import {
  cargarConversaciones,
  guardarConversaciones,
  nuevaConversacion,
} from "./src/agente/servicioConversaciones";

/* El motor de IA contesta siempre lo mismo, sin tocar la red. */
function iaFalsa(respuesta = "Respuesta de prueba del asistente.") {
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: respuesta } }],
        }),
      })
    )
  );
}

beforeEach(() => {
  localStorage.clear();
  iaFalsa();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("regla 3: nunca datos de clientes hacia la IA", () => {
  it("quita correos, cédulas y teléfonos", () => {
    const { texto, hallazgos } = filtrarDatosPersonales(
      "Contacto a juan.perez@correo.com con cédula 1.234.567.890 y celular 300 725 7266"
    );
    expect(texto).not.toContain("juan.perez@correo.com");
    expect(texto).not.toContain("1.234.567.890");
    expect(texto).not.toContain("300 725 7266");
    expect(hallazgos).toContain("correo");
    expect(hallazgos.length).toBeGreaterThan(0);
  });

  it("deja intacto un texto sin datos personales", () => {
    const frase = "Redacta una publicación sobre contrato de arrendamiento.";
    const { texto, hallazgos } = filtrarDatosPersonales(frase);
    expect(texto).toBe(frase);
    expect(hallazgos).toEqual([]);
    expect(avisoFiltrado(hallazgos)).toBe("");
  });
});

describe("aprendizaje de ideas", () => {
  it("extrae el bloque IDEAS", () => {
    const lista = extraerIdeas(
      "Aquí va tu publicación.\n\nIDEAS\n- Publica el lunes sobre insolvencia\n- Prompt: carrusel de 5 slides"
    );
    expect(lista.length).toBe(2);
    expect(lista[0]).toContain("insolvencia");
  });

  it("devuelve vacío si no hay bloque", () => {
    expect(extraerIdeas("Solo una respuesta normal.")).toEqual([]);
  });
});

describe("historial de conversaciones", () => {
  it("se guarda y se recupera del almacenamiento local", () => {
    const conversacion = nuevaConversacion("biblioteca");
    conversacion.titulo = "Prueba guardada";
    guardarConversaciones([conversacion]);
    const leidas = cargarConversaciones();
    expect(leidas).toHaveLength(1);
    expect(leidas[0].titulo).toBe("Prueba guardada");
    expect(leidas[0].pestana).toBe("biblioteca");
  });
});

describe("interfaz del asistente", () => {
  it("muestra el saludo numerado, el contador y el aviso de privacidad", () => {
    render(<ChatAgente />);
    expect(screen.getByPlaceholderText(/Escribe qué necesitas publicar/)).toBeTruthy();
    expect(screen.getByText("0/2000")).toBeTruthy();
    expect(screen.getByText(/Evita incluir datos personales/)).toBeTruthy();
    expect(screen.getByText("+ Nueva conversación")).toBeTruthy();
    expect(screen.getAllByText(/Historial/).length).toBeGreaterThan(0);
  });

  it("elige una opción del menú y cuenta los caracteres", () => {
    render(<ChatAgente />);
    const opciones = document.querySelectorAll(".agente-opcion");
    fireEvent.click(opciones[0]);
    expect((screen.getByLabelText("Mensaje para el asistente") as HTMLTextAreaElement).value).toContain(
      "publicación para redes sociales"
    );
    expect(screen.getByText(/\/2000/)).toBeTruthy();
  });

  it("envía un mensaje y guarda la respuesta en la conversación", async () => {
    render(<ChatAgente />);
    const caja = screen.getByLabelText("Mensaje para el asistente") as HTMLTextAreaElement;
    fireEvent.change(caja, { target: { value: "Hazme una publicación de bienvenida" } });
    fireEvent.click(screen.getByText("Enviar"));

    await waitFor(
      () => {
        expect(screen.getByText("Respuesta de prueba del asistente.")).toBeTruthy();
      },
      { timeout: 5000 }
    );
    const guardadas = cargarConversaciones();
    const ultima = guardadas[guardadas.length - 1];
    expect(ultima.mensajes.some((m) => m.rol === "usuario")).toBe(true);
    expect(ultima.mensajes.some((m) => m.rol === "asistente")).toBe(true);
  });

  it("el botón 🎬 Generar prompt inicia la entrevista guiada del video", async () => {
    render(<ChatAgente />);
    fireEvent.click(screen.getByText(/Generar prompt/, { selector: "button" }));
    await waitFor(() => {
      expect(screen.getByText(/Cuéntame qué video quieres/)).toBeTruthy();
    });
  });

  it("las opciones rápidas desaparecen después del primer mensaje del usuario", async () => {
    render(<ChatAgente />);
    expect(screen.getByText(/Crear una publicación para redes/, { selector: "button" })).toBeTruthy();
    const caja = screen.getByLabelText("Mensaje para el asistente") as HTMLTextAreaElement;
    fireEvent.change(caja, { target: { value: "Hola" } });
    fireEvent.click(screen.getByText("Enviar", { selector: "button" }));
    await waitFor(() => {
      expect(screen.queryByText(/Crear una publicación para redes/, { selector: "button" })).toBeNull();
    });
  });

  it("filtra datos personales antes de enviar (regla 3)", async () => {
    render(<ChatAgente />);
    const caja = screen.getByLabelText("Mensaje para el asistente") as HTMLTextAreaElement;
    fireEvent.change(caja, {
      target: { value: "Escribe algo para juan@cliente.com por favor" },
    });
    fireEvent.click(screen.getByText("Enviar"));

    await waitFor(
      () => {
        expect(screen.getByText(/detecté correo/)).toBeTruthy();
      },
      { timeout: 5000 }
    );
    const guardadas = cargarConversaciones();
    const usuario = guardadas[guardadas.length - 1].mensajes.find((m) => m.rol === "usuario");
    expect(usuario?.texto).not.toContain("juan@cliente.com");
    expect(usuario?.texto).toContain("[correo eliminado]");
  });

  it("crea y borra conversaciones del historial", () => {
    window.confirm = () => true; // el borrado pide confirmación
    render(<ChatAgente />);
    const total = screen.getAllByTitle("Borrar conversación").length;
    fireEvent.click(screen.getByText("+ Nueva conversación"));
    expect(screen.getAllByTitle("Borrar conversación").length).toBe(total + 1);
    fireEvent.click(screen.getAllByTitle("Borrar conversación")[0]);
    expect(screen.getAllByTitle("Borrar conversación").length).toBe(total);
  });
});
