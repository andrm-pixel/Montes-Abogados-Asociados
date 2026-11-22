import { describe, it, expect, vi, beforeEach } from "vitest";

/* Un "Supabase" falso: así se prueba la lógica sin tocar la base real. */
const fake = vi.hoisted(() => ({
  rpc: vi.fn(),
  auth: {
    getSession: vi.fn(),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    updateUser: vi.fn(),
  },
  from: vi.fn(),
}));

vi.mock("./src/lib/supabase.js", () => ({
  hayBackend: () => true,
  LLEGO_POR_RECUPERACION: false,
  supabase: fake,
}));

import {
  enviarSolicitud, registrar, entrar, entrarPersonal, cambiarClave, cambiarEstadoSolicitud, slugDeArea, esPersonal,
} from "./src/lib/cuentas.js";

/* Arma una consulta falsa encadenable que termina en maybeSingle(). */
function perfilFalso(fila) {
  const q = { select: () => q, eq: () => q, maybeSingle: () => Promise.resolve({ data: fila }) };
  return q;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("solicitudes", () => {
  it("manda la solicitud con el área como slug de la base (cartera → recaudo)", async () => {
    fake.rpc.mockResolvedValue({ data: [{ id: 1, codigo: "MAA-000001" }], error: null });
    const r = await enviarSolicitud({
      nombre: "Ana", apellido: "Pérez", correo: "ana@correo.co", telefono: "3001234567",
      area: "cartera", mensaje: "Hola", boletin: true, version: "22 de octubre de 2026",
    });
    expect(r).toEqual({ ok: true, codigo: "MAA-000001", id: 1 });
    expect(fake.rpc).toHaveBeenCalledWith("enviar_solicitud", expect.objectContaining({
      p_area_slug: "recaudo", p_acepta_politica: true, p_boletin: true,
      p_version_politica: "22 de octubre de 2026",
    }));
  });

  it("reconoce el límite de solicitudes por hora", async () => {
    fake.rpc.mockResolvedValue({
      data: null, error: { code: "P0001", message: "Demasiadas solicitudes seguidas. Intente de nuevo más tarde" },
    });
    const r = await enviarSolicitud({ nombre: "A", correo: "a@a.co", mensaje: "m", area: "laboral" });
    expect(r).toEqual({ ok: false, codigo: "limite" });
  });

  it("si no hay red devuelve el código red y no lanza error", async () => {
    fake.rpc.mockRejectedValue(new TypeError("Failed to fetch"));
    const r = await enviarSolicitud({ nombre: "A", correo: "a@a.co", mensaje: "m" });
    expect(r).toEqual({ ok: false, codigo: "red" });
  });

  it("solo acepta estados válidos al cambiar una solicitud", async () => {
    const r = await cambiarEstadoSolicitud(1, "inventado");
    expect(r.ok).toBe(false);
    expect(fake.from).not.toHaveBeenCalled();
  });

  it("slugDeArea deja igual las demás áreas", () => {
    expect(slugDeArea("laboral")).toBe("laboral");
    expect(slugDeArea("cartera")).toBe("recaudo");
  });
});

describe("cuentas", () => {
  it("registrar separa nombre y apellido y avisa que falta confirmar el correo", async () => {
    fake.auth.signUp.mockResolvedValue({ data: { user: { identities: [{}] }, session: null }, error: null });
    const r = await registrar({ nombre: "Ana María Pérez", correo: "a@a.co", telefono: "3001234567", clave: "claveSegura1" });
    expect(r).toEqual({ ok: true, necesitaConfirmar: true });
    const args = fake.auth.signUp.mock.calls[0][0];
    expect(args.options.data).toEqual({ nombre: "Ana", apellido: "María Pérez", telefono: "3001234567" });
  });

  it("registrar detecta un correo que ya existe (usuario sin identidades)", async () => {
    fake.auth.signUp.mockResolvedValue({ data: { user: { identities: [] }, session: null }, error: null });
    const r = await registrar({ nombre: "Ana", correo: "a@a.co", telefono: "3001234567", clave: "claveSegura1" });
    expect(r).toEqual({ ok: false, codigo: "user_already_exists" });
  });

  it("entrar devuelve el código de Supabase cuando la clave es incorrecta", async () => {
    fake.auth.signInWithPassword.mockResolvedValue({ error: { code: "invalid_credentials", message: "x" } });
    expect(await entrar("a@a.co", "mala")).toEqual({ ok: false, codigo: "invalid_credentials" });
  });
});

describe("personal del panel", () => {
  function conRol(rol, activo = true) {
    fake.auth.signInWithPassword.mockResolvedValue({ error: null });
    fake.auth.getSession.mockResolvedValue({ data: { session: { user: { id: "u1", email: "x@x.co", user_metadata: {} } } } });
    fake.from.mockReturnValue(perfilFalso({ usuario: "x", nombre: "X", apellido: null, correo: "x@x.co", telefono: null, iniciales: "X", rol, activo }));
    fake.auth.signOut.mockResolvedValue({});
  }

  it("deja entrar a un administrador", async () => {
    conRol("admin");
    const r = await entrarPersonal("x@x.co", "clave");
    expect(r.ok).toBe(true);
    expect(fake.auth.signOut).not.toHaveBeenCalled();
  });

  it("rechaza a un cliente y le cierra la sesión", async () => {
    conRol("cliente");
    const r = await entrarPersonal("x@x.co", "clave");
    expect(r).toEqual({ ok: false, codigo: "sin_permiso" });
    expect(fake.auth.signOut).toHaveBeenCalled();
  });

  it("rechaza a un administrador desactivado", async () => {
    conRol("admin", false);
    const r = await entrarPersonal("x@x.co", "clave");
    expect(r.ok).toBe(false);
  });

  it("esPersonal solo acepta admin o editor activos", () => {
    expect(esPersonal({ rol: "editor", activo: true })).toBe(true);
    expect(esPersonal({ rol: "cliente", activo: true })).toBe(false);
    expect(esPersonal(null)).toBe(false);
  });

  it("cambiarClave confirma la clave actual antes de cambiarla", async () => {
    fake.auth.getSession.mockResolvedValue({ data: { session: { user: { email: "x@x.co" } } } });
    fake.auth.signInWithPassword.mockResolvedValue({ error: { code: "invalid_credentials", message: "x" } });
    const r = await cambiarClave("incorrecta", "nuevaClave123");
    expect(r).toEqual({ ok: false, codigo: "invalid_credentials" });
    expect(fake.auth.updateUser).not.toHaveBeenCalled();
  });
});
