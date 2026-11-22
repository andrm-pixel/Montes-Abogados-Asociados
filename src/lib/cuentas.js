/* =============================================================
   CUENTAS, SOLICITUDES Y PERSONAL — llamadas a Supabase
   -------------------------------------------------------------
   Todas las funciones devuelven una promesa con { ok: true, ... }
   o { ok: false, codigo: "..." }. Nunca lanzan errores: así el
   sitio decide qué mensaje mostrar según el código.
   ============================================================= */
import { supabase, hayBackend, LLEGO_POR_RECUPERACION } from "./supabase.js";

export { hayBackend };

/* true si la página se abrió desde el enlace "restablecer contraseña" del correo. */
export function llegoPorRecuperacion() {
  return LLEGO_POR_RECUPERACION;
}

/* ---------- Estados de una solicitud ---------- */
export const ESTADOS = ["recibida", "en_revision", "respondida", "cerrada", "spam"];

export const ETIQUETA_ESTADO = {
  es: { recibida: "Recibida", en_revision: "En revisión", respondida: "Respondida", cerrada: "Cerrada", spam: "Spam" },
  en: { recibida: "Received", en_revision: "In review", respondida: "Replied", cerrada: "Closed", spam: "Spam" },
};

/* El desplegable del formulario usa "cartera"; en la base el área
   se llama "recaudo" (igual que su página area-recaudo.html). */
const AREA_A_SLUG = { cartera: "recaudo" };

export function slugDeArea(valor) {
  return AREA_A_SLUG[valor] || valor;
}

export function iniciales(nombre) {
  return String(nombre || "")
    .trim()
    .split(/\s+/)
    .map((p) => p.charAt(0))
    .join("")
    .substring(0, 2)
    .toUpperCase();
}

/* Convierte un error de Supabase en un código corto y estable. */
function codigoDeError(error) {
  if (!error) return "";
  const msg = String(error.message || "");
  if (/failed to fetch|network|load failed|fetch/i.test(msg) && !error.code) return "red";
  if (/demasiadas solicitudes/i.test(msg)) return "limite";
  return error.code || "desconocido";
}

function sinConexion() {
  return { ok: false, codigo: "sin_backend" };
}

/* ---------- Sesión y perfil ---------- */

/* Datos de quien tiene la sesión abierta (o null). */
export async function perfilActual() {
  if (!supabase) return null;
  const { data: sesionData } = await supabase.auth.getSession();
  const sesion = sesionData && sesionData.session;
  if (!sesion) return null;

  const usuario = sesion.user;
  const meta = usuario.user_metadata || {};
  let fila = null;
  try {
    const r = await supabase
      .from("profiles")
      .select("usuario, nombre, apellido, correo, telefono, iniciales, rol, activo")
      .eq("id", usuario.id)
      .maybeSingle();
    fila = r.data || null;
  } catch (error) {
    fila = null;
  }

  const nombre = fila
    ? [fila.nombre, fila.apellido].filter(Boolean).join(" ")
    : [meta.nombre, meta.apellido].filter(Boolean).join(" ");
  const nombreFinal = nombre || usuario.email || "";

  return {
    id: usuario.id,
    usuario: (fila && fila.usuario) || usuario.email,
    nombre: nombreFinal,
    correo: usuario.email,
    telefono: (fila && fila.telefono) || meta.telefono || "",
    iniciales: (fila && fila.iniciales) || iniciales(nombreFinal),
    rol: (fila && fila.rol) || "cliente",
    activo: fila ? fila.activo !== false : true,
  };
}

/* Avisa cada vez que alguien entra, sale o llega desde un enlace del correo. */
export function alCambiarSesion(callback) {
  if (!supabase) return function () {};
  const { data } = supabase.auth.onAuthStateChange((evento, sesion) => callback(evento, sesion));
  return () => data.subscription.unsubscribe();
}

export async function registrar({ nombre, correo, telefono, clave }) {
  if (!supabase) return sinConexion();
  const partes = String(nombre || "").trim().split(/\s+/);
  const primero = partes.shift() || "";
  const apellido = partes.join(" ");
  try {
    const { data, error } = await supabase.auth.signUp({
      email: correo,
      password: clave,
      options: {
        data: { nombre: primero, apellido, telefono },
        emailRedirectTo: window.location.origin + "/",
      },
    });
    if (error) return { ok: false, codigo: codigoDeError(error) };
    // Con "Confirm email" activo, un correo ya registrado no da error:
    // devuelve un usuario sin identidades.
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      return { ok: false, codigo: "user_already_exists" };
    }
    return { ok: true, necesitaConfirmar: !data.session };
  } catch (error) {
    return { ok: false, codigo: codigoDeError(error) };
  }
}

export async function entrar(correo, clave) {
  if (!supabase) return sinConexion();
  try {
    const { error } = await supabase.auth.signInWithPassword({ email: correo, password: clave });
    if (error) return { ok: false, codigo: codigoDeError(error) };
    return { ok: true };
  } catch (error) {
    return { ok: false, codigo: codigoDeError(error) };
  }
}

export async function salir() {
  if (!supabase) return { ok: true };
  try {
    await supabase.auth.signOut();
  } catch (error) {
    /* aunque falle la red, la sesión local se limpia */
  }
  return { ok: true };
}

export async function pedirRecuperacion(correo) {
  if (!supabase) return sinConexion();
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(correo, {
      redirectTo: window.location.origin + "/",
    });
    if (error) return { ok: false, codigo: codigoDeError(error) };
    return { ok: true };
  } catch (error) {
    return { ok: false, codigo: codigoDeError(error) };
  }
}

/* Pone la contraseña nueva (después de abrir el enlace del correo). */
export async function actualizarClave(nueva) {
  if (!supabase) return sinConexion();
  try {
    const { error } = await supabase.auth.updateUser({ password: nueva });
    if (error) return { ok: false, codigo: codigoDeError(error) };
    return { ok: true };
  } catch (error) {
    return { ok: false, codigo: codigoDeError(error) };
  }
}

/* Cambia la contraseña confirmando primero la actual. */
export async function cambiarClave(actual, nueva) {
  if (!supabase) return sinConexion();
  try {
    const { data } = await supabase.auth.getSession();
    const sesion = data && data.session;
    if (!sesion) return { ok: false, codigo: "sin_sesion" };
    const verificar = await supabase.auth.signInWithPassword({
      email: sesion.user.email,
      password: actual,
    });
    if (verificar.error) return { ok: false, codigo: codigoDeError(verificar.error) };
    return await actualizarClave(nueva);
  } catch (error) {
    return { ok: false, codigo: codigoDeError(error) };
  }
}

/* ---------- Solicitudes del visitante ---------- */

export async function enviarSolicitud({ nombre, apellido, correo, telefono, area, mensaje, boletin, version }) {
  if (!supabase) return sinConexion();
  try {
    const { data, error } = await supabase.rpc("enviar_solicitud", {
      p_nombre: nombre,
      p_correo: correo,
      p_mensaje: mensaje,
      p_apellido: apellido || null,
      p_telefono: telefono || null,
      p_area_slug: slugDeArea(area) || null,
      p_boletin: Boolean(boletin),
      p_version_politica: version || null,
      p_acepta_politica: true,
    });
    if (error) return { ok: false, codigo: codigoDeError(error) };
    const fila = Array.isArray(data) ? data[0] : data;
    return { ok: true, codigo: fila && fila.codigo, id: fila && fila.id };
  } catch (error) {
    return { ok: false, codigo: codigoDeError(error) };
  }
}

/* Las solicitudes de quien tiene la sesión abierta (la base ya filtra). */
export async function misSolicitudes() {
  if (!supabase) return sinConexion();
  try {
    const { data, error } = await supabase
      .from("contact_requests")
      .select("id, codigo, area_nombre, mensaje, estado, creado_en")
      .order("creado_en", { ascending: false })
      .limit(100);
    if (error) return { ok: false, codigo: codigoDeError(error) };
    return { ok: true, solicitudes: data || [] };
  } catch (error) {
    return { ok: false, codigo: codigoDeError(error) };
  }
}

/* Suscribe el correo al boletín (si marcó la casilla). Mejor esfuerzo. */
export async function suscribirBoletin(correo, nombre) {
  if (!supabase) return sinConexion();
  try {
    const { error } = await supabase.rpc("suscribir_boletin", { p_correo: correo, p_nombre: nombre || null });
    if (error) return { ok: false, codigo: codigoDeError(error) };
    return { ok: true };
  } catch (error) {
    return { ok: false, codigo: codigoDeError(error) };
  }
}

/* ---------- Personal (panel de administración) ---------- */

export function esPersonal(perfil) {
  return Boolean(perfil && perfil.activo && (perfil.rol === "admin" || perfil.rol === "editor"));
}

/* Entra solo si la cuenta es admin o editor; si no, cierra la sesión. */
export async function entrarPersonal(correo, clave) {
  const r = await entrar(correo, clave);
  if (!r.ok) return r;
  const perfil = await perfilActual();
  if (!esPersonal(perfil)) {
    await salir();
    return { ok: false, codigo: "sin_permiso" };
  }
  return { ok: true, perfil };
}

export async function listarSolicitudes() {
  if (!supabase) return sinConexion();
  try {
    const { data, error } = await supabase
      .from("contact_requests")
      .select("id, codigo, tipo, area_nombre, nombre_completo, correo, telefono, mensaje, estado, creado_en")
      .order("creado_en", { ascending: false })
      .limit(500);
    if (error) return { ok: false, codigo: codigoDeError(error) };
    return { ok: true, solicitudes: data || [] };
  } catch (error) {
    return { ok: false, codigo: codigoDeError(error) };
  }
}

/* Borra una solicitud de la base. Solo el administrador puede hacerlo (RLS). */
export async function borrarSolicitud(id) {
  if (!supabase) return sinConexion();
  try {
    const { error } = await supabase.from("contact_requests").delete().eq("id", id);
    if (error) return { ok: false, codigo: codigoDeError(error) };
    return { ok: true };
  } catch (error) {
    return { ok: false, codigo: codigoDeError(error) };
  }
}

export async function cambiarEstadoSolicitud(id, estado) {
  if (!supabase) return sinConexion();
  if (!ESTADOS.includes(estado)) return { ok: false, codigo: "estado_invalido" };
  try {
    const { error } = await supabase.from("contact_requests").update({ estado }).eq("id", id);
    if (error) return { ok: false, codigo: codigoDeError(error) };
    return { ok: true };
  } catch (error) {
    return { ok: false, codigo: codigoDeError(error) };
  }
}
