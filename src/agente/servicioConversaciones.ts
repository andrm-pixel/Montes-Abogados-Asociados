/* =============================================================
   PERSISTENCIA DE CONVERSACIONES
   -------------------------------------------------------------
   - Siempre guarda en localStorage (funciona sin internet).
   - Si el proyecto trae VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
     (clave pública, permitida en el navegador) además sincroniza
     con Supabase para que el historial sobreviva a otros equipos.
   La clave de servicio (service role) NUNCA aparece aquí.
   ============================================================= */

import type { Conversacion, Idea, Propuesta } from "./tipos";
import { nuevoId } from "./tipos";
import { supabase } from "../lib/supabase";

const CLAVE_LOCAL = "maa.agente.conversaciones";
const CLAVE_IDEAS = "maa.agente.ideas";
const CLAVE_PROPUESTAS = "maa.agente.propuestas";

type Env = Record<string, string> | undefined;
const env = (import.meta as unknown as { env?: Env }).env;
const SUPABASE_URL = env?.VITE_SUPABASE_URL || "";
const SUPABASE_ANON = env?.VITE_SUPABASE_ANON_KEY || "";

export function haySupabase(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON);
}

function leerLocal<T>(clave: string, porDefecto: T): T {
  try {
    const crudo = localStorage.getItem(clave);
    if (!crudo) return porDefecto;
    return JSON.parse(crudo) as T;
  } catch {
    return porDefecto;
  }
}

function escribirLocal(clave: string, valor: unknown): void {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    /* modo privado o sin espacio: se queda sólo en memoria */
  }
}

/** Cabeceras para Supabase REST.
    Se usa el token de la sesión abierta (no solo la clave pública):
    las reglas del agente exigen que quien guarda sea editor o admin.
    Sin ese token, Supabase rechaza todo en silencio. */
async function cabeceras(): Promise<Record<string, string>> {
  let token = SUPABASE_ANON;
  if (supabase) {
    try {
      const { data } = await supabase.auth.getSession();
      const sesion = data && data.session;
      if (sesion && sesion.access_token) token = sesion.access_token;
    } catch {
      /* sin sesión se intenta con la clave pública */
    }
  }
  return {
    "Content-Type": "application/json",
    apikey: SUPABASE_ANON,
    Authorization: "Bearer " + token,
    // merge-duplicates: si la fila ya existe, la actualiza en vez de fallar.
    Prefer: "return=minimal,resolution=merge-duplicates",
  };
}

/* ---------------- Conversaciones ---------------- */

export function cargarConversaciones(): Conversacion[] {
  const locales = leerLocal<Conversacion[]>(CLAVE_LOCAL, []);
  if (!haySupabase()) return locales;
  // Dispara la sincronización sin bloquear la interfaz.
  sincronizarDesdeSupabase().catch(() => undefined);
  return locales;
}

export function guardarConversaciones(lista: Conversacion[]): void {
  escribirLocal(CLAVE_LOCAL, lista);
  if (haySupabase()) subirAEstadoPendiente(lista);
}

export function nuevaConversacion(pestana: Conversacion["pestana"] = "chat"): Conversacion {
  const ahora = Date.now();
  return {
    id: nuevoId(),
    titulo: "Nueva conversación",
    pestana,
    mensajes: [],
    creadaEn: ahora,
    actualizadaEn: ahora,
  };
}

/* ---------- Sincronización con Supabase (best effort) ---------- */

async function subirAEstadoPendiente(lista: Conversacion[]): Promise<void> {
  // Se suben sólo las conversaciones con mensajes (evita ruido).
  const conMensajes = lista.filter((c) => c.mensajes.length > 0);
  await fetch(SUPABASE_URL + "/rest/v1/conversaciones?on_conflict=id", {
    method: "POST",
    headers: await cabeceras(),
    body: JSON.stringify(
      conMensajes.map((c) => ({
        id: c.id,
        titulo: c.titulo,
        pestana: c.pestana,
        creada_en: new Date(c.creadaEn).toISOString(),
        actualizada_en: new Date(c.actualizadaEn).toISOString(),
      }))
    ),
  });
  const filas = conMensajes.flatMap((c) =>
    c.mensajes.map((m) => ({
      id: m.id,
      conversacion_id: c.id,
      rol: m.rol,
      texto: m.texto,
      creado_en: new Date(m.creadoEn).toISOString(),
    }))
  );
  if (filas.length) {
    await fetch(SUPABASE_URL + "/rest/v1/mensajes?on_conflict=id", {
      method: "POST",
      headers: await cabeceras(),
      body: JSON.stringify(filas),
    });
  }
}

async function sincronizarDesdeSupabase(): Promise<void> {
  const respuesta = await fetch(
    SUPABASE_URL +
      "/rest/v1/conversaciones?select=*,mensajes(*)&order=actualizada_en.desc&limit=50",
    { headers: await cabeceras() }
  );
  if (!respuesta.ok) return;
  const filas = (await respuesta.json()) as Array<Record<string, unknown>>;
  const remotas: Conversacion[] = filas.map((f) => ({
    id: String(f.id),
    titulo: String(f.titulo ?? "Nueva conversación"),
    pestana: (f.pestana as Conversacion["pestana"]) || "chat",
    creadaEn: Date.parse(String(f.creada_en)) || Date.now(),
    actualizadaEn: Date.parse(String(f.actualizada_en)) || Date.now(),
    mensajes: ((f.mensajes as Array<Record<string, unknown>>) || []).map((m) => ({
      id: String(m.id),
      rol: m.rol as Conversacion["mensajes"][number]["rol"],
      texto: String(m.texto ?? ""),
      creadoEn: Date.parse(String(m.creado_en)) || Date.now(),
    })),
  }));
  if (!remotas.length) return;

  const locales = leerLocal<Conversacion[]>(CLAVE_LOCAL, []);
  const porId = new Map(locales.map((c) => [c.id, c]));
  for (const remota of remotas) {
    const local = porId.get(remota.id);
    if (!local || remota.actualizadaEn > local.actualizadaEn) porId.set(remota.id, remota);
  }
  escribirLocal(CLAVE_LOCAL, Array.from(porId.values()));
}

/* ---------------- Ideas y prompts aprendidos ---------------- */

export function cargarIdeas(): Idea[] {
  return leerLocal<Idea[]>(CLAVE_IDEAS, []);
}

export function guardarIdeas(lista: Idea[]): void {
  escribirLocal(CLAVE_IDEAS, lista);
  if (!haySupabase()) return;
  const cuerpo = JSON.stringify(
    lista.map((i) => ({
      id: i.id,
      tipo: i.tipo,
      texto: i.texto,
      util: i.util,
      veces_usado: i.vecesUsado,
    }))
  );
  void (async () => {
    try {
      await fetch(SUPABASE_URL + "/rest/v1/aprendizaje?on_conflict=id", {
        method: "POST",
        headers: await cabeceras(),
        body: cuerpo,
      });
    } catch {
      /* sin conexión: queda guardado en el navegador */
    }
  })();
}

/* ---------------- Propuestas (regla 2) ---------------- */

export function cargarPropuestas(): Propuesta[] {
  return leerLocal<Propuesta[]>(CLAVE_PROPUESTAS, []);
}

export function guardarPropuestas(lista: Propuesta[]): void {
  escribirLocal(CLAVE_PROPUESTAS, lista);
  if (!haySupabase()) return;
  const cuerpo = JSON.stringify(
    lista.map((p) => ({
      id: p.id,
      texto: p.texto,
      tipo: p.tipo,
      estado: p.estado,
      destino: p.destino ?? null,
      creado_en: new Date(p.creadoEn).toISOString(),
    }))
  );
  void (async () => {
    try {
      await fetch(SUPABASE_URL + "/rest/v1/propuestas?on_conflict=id", {
        method: "POST",
        headers: await cabeceras(),
        body: cuerpo,
      });
    } catch {
      /* sin conexión: queda guardado en el navegador */
    }
  })();
}
