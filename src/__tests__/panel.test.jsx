import { describe, it, expect, beforeEach } from "vitest";
import { render, waitFor, fireEvent } from "@testing-library/react";
import PanelAdmin from "../componentes/PanelAdmin.jsx";

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = "";
});

describe("panel de administración", () => {
  it("entra, agrega una diapositiva del carrusel y la guarda", async () => {
    const { container } = render(<PanelAdmin />);
    await waitFor(() => expect(container.querySelector("#btnEntrar")).not.toBeNull());

    container.querySelector("#usuario").value = "admin";
    container.querySelector("#clave").value = "montes2026";
    fireEvent.click(container.querySelector("#btnEntrar"));

    await waitFor(() => expect(container.querySelector("#listaCarrusel")).not.toBeNull());
    fireEvent.click(container.querySelector("#btnAgregarDiapositiva"));
    await waitFor(() => expect(container.querySelector("#carTitulo0")).not.toBeNull());
    container.querySelector("#carTitulo0").value = "Titulo desde React";
    fireEvent.click(container.querySelector("#btnGuardar"));

    const guardado = JSON.parse(localStorage.getItem("datosMontesSitio"));
    expect(guardado.carrusel.length).toBe(1);
    expect(guardado.carrusel[0].titulo).toBe("Titulo desde React");
  });
});
