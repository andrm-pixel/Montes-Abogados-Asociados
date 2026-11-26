import { describe, it, expect } from "vitest";
import {
  interpretarPedido, esPedidoNuevo, numeroDeVideoEnAjuste, repartirServicios, serviciosFaltantes,
  normaliza, extraerEscenas, construirPartes, parsearPartes, armarPartes, rango,
  SITIO_WEB, CONTACTO_CIERRE, FRASE_CIERRE,
} from "./src/agente/pedidoVideo";
import { mensajesDeVideos } from "./src/agente/formatoVideo";

describe("interpretarPedido", () => {
  it("lee '2 videos de 1 minuto' con los servicios", () => {
    const p = interpretarPedido("quiero crear 2 videos de 1 minuto explicando cada uno de nuestros servicios");
    expect(p.cantidad).toBe(2);
    expect(p.duracion).toBe(60);
    expect(p.duracionExplicita).toBe(true);
    expect(p.incluirServicios).toBe(true);
  });
  it("sin duración usa 60 s y un video", () => {
    const p = interpretarPedido("liquidación de prestaciones");
    expect([p.duracion, p.cantidad, p.incluirServicios]).toEqual([60, 1, false]);
  });
  it("redondea a bloques de 15 s", () => {
    expect(interpretarPedido("un video de 30s").duracion).toBe(30);
    expect(interpretarPedido("video de medio minuto").duracion).toBe(30);
    expect(interpretarPedido("video de 2 minutos").duracion).toBe(120);
    expect(interpretarPedido("video de 50 segundos").duracion).toBe(45);
  });
});

describe("intención del texto", () => {
  it("distingue pedido nuevo de ajuste", () => {
    expect(esPedidoNuevo("quiero crear 2 videos promocionando la empresa")).toBe(true);
    expect(esPedidoNuevo("cambia el tono a más formal")).toBe(false);
    expect(esPedidoNuevo("video 2: más formal")).toBe(false);
  });
  it("lee el número de video del ajuste", () => {
    expect(numeroDeVideoEnAjuste("video 2: más formal")).toBe(2);
    expect(numeroDeVideoEnAjuste("en el segundo video cambia el cierre")).toBe(2);
    expect(numeroDeVideoEnAjuste("más formal")).toBe(0);
  });
});

describe("servicios", () => {
  it("reparte los 7 servicios en las partes", () => {
    expect(repartirServicios(4).map((g) => g.length)).toEqual([2, 2, 2, 1]);
    expect(repartirServicios(2).map((g) => g.length)).toEqual([4, 3]);
    expect(repartirServicios(1)[0].length).toBe(7);
  });
  it("detecta los servicios que faltan", () => {
    expect(serviciosFaltantes("derecho comercial, laboral y litigio")).toHaveLength(4);
  });
});

describe("normaliza", () => {
  it("reemplaza el dominio anterior por el sitio oficial y respeta el correo", () => {
    const t = normaliza("Visite [www.montes-a.com](https://www.montes-a.com) o claudia@montes-a.com");
    expect(t).toContain(SITIO_WEB);
    expect(t).not.toContain("www.montes-a.com");
    expect(t).toContain("claudia@montes-a.com");
  });
});

const GUION = `# Guión
**ESCENA 1: Apertura (0:00–0:07)**
*Visual:* Escritorio con carpeta.
**VOZ EN OFF:** "Hola."
**ESCENA 2: Problema (0:07–0:15)**
*Visual:* Empresario revisa contratos.
**VOZ EN OFF:** "Riesgos."
**ESCENA 3: Cierre (0:15–0:30)**
*Visual:* Logo sobre fondo blanco.
**VOZ EN OFF:** "${FRASE_CIERRE}"
*Texto en pantalla:* **${CONTACTO_CIERRE}**`;

describe("del guion a los prompts de 15 s", () => {
  it("lee las escenas", () => {
    const e = extraerEscenas(GUION);
    expect(e).toHaveLength(3);
    expect(e[1]).toMatchObject({ desde: 7, hasta: 15, visual: "Empresario revisa contratos.", voz: "Riesgos." });
  });
  it("arma una parte por bloque y marca la continuación", () => {
    const partes = armarPartes(construirPartes(extraerEscenas(GUION), 2)!, 1, 1);
    expect(partes).toHaveLength(2);
    expect(partes[0].texto).toMatch(/^ESTE ES EL PROMPT DEL VIDEO/);
    expect(partes[1].texto).toMatch(/^ESTA ES LA CONTINUACIÓN DEL VIDEO/);
    expect(partes[1].texto).toContain(CONTACTO_CIERRE);
    expect(partes[1].texto).not.toMatch(/www\./);
  });
  it("devuelve null si un bloque queda sin escenas", () => {
    expect(construirPartes(extraerEscenas(GUION), 4)).toBeNull();
  });
  it("separa las partes que escribe el modelo", () => {
    const t = "#### PARTE 1 de 2 (0:00–0:15)\nuno uno\n#### PARTE 2 de 2 (0:15–0:30)\ndos dos";
    expect(parsearPartes(t)).toEqual(["uno uno", "dos dos"]);
    expect(rango(2)).toBe("0:15–0:30");
  });
});

describe("mensajes del chat", () => {
  it("un mensaje por parte, con guion y redes", () => {
    const partes = armarPartes(["a a a", "b b b"], 1, 2);
    const m = mensajesDeVideos([
      { numero: 1, duracion_seg: 30, total_partes: 2, guion: "G", partes, texto_redes: "R", notas_revision: "" },
    ]);
    expect(m).toHaveLength(5); // guion + 2 partes + redes + cierre
    expect(m[0]).toContain("VIDEO 1");
    expect(m[2]).toContain("CONTINUACIÓN");
  });
});
