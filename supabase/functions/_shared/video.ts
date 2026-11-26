// supabase/functions/_shared/video.ts
// Lógica PURA del prompt de video (sin APIs de Deno ni del navegador).
// La usan dos lugares: la función de Supabase `generar-prompt-video` y el chat del panel
// (src/agente/pedidoVideo.ts la reexporta). Así se prueba una sola vez con `npm test`.

export const NOMBRE_FIRMA = "ABOGADOS COLOMBIA - Montes Abogados Asociados S.A.S.";
export const WHATSAPP = "+57, 300, 725, 7266";
export const FRASE_CIERRE =
  "Una asesoría jurídica especializada ayuda a su empresa a prevenir contingencias y litigios futuros, garantizando seguridad y tranquilidad.";
export const SITIO_WEB = "montes-abogados-asociados.pages.dev";
export const CONTACTO_CIERRE = "Dirígete a " + SITIO_WEB + " o al WhatsApp " + WHATSAPP;

/** Los 7 servicios, en el orden en que se mencionan. `clave` sirve para comprobar que salieron todos. */
export const SERVICIOS: { nombre: string; clave: RegExp }[] = [
  { nombre: "derecho comercial y contratos", clave: /derecho comercial|contratos/ },
  { nombre: "derecho laboral y seguridad social", clave: /laboral/ },
  { nombre: "litigio civil y comercial", clave: /litigio/ },
  { nombre: "insolvencia empresarial", clave: /insolvencia/ },
  { nombre: "derecho administrativo", clave: /administrativ/ },
  { nombre: "derecho migratorio", clave: /migratori/ },
  { nombre: "recaudo de cartera", clave: /recaudo/ },
];

/** Cada video se genera con un ángulo distinto para que, si piden 2 o 3, no sean copias. */
export const ENFOQUES = [
  "Presentación de la firma: quiénes somos y un recorrido por todos sus servicios.",
  "Problema y solución: situaciones reales de una empresa en las que cada servicio le ayuda.",
  "Prevención: cada servicio como parte del área jurídica de la empresa para evitar litigios.",
];

/* ------------------------------ tiempos ------------------------------ */

export const BLOQUE = 15; // segundos que dura cada prompt para la herramienta de video
export const MAX_DURACION = 120;
export const MAX_VIDEOS = 3;

export const aMultiploDe15 = (seg: number) =>
  Math.min(MAX_DURACION, Math.max(BLOQUE, Math.round(seg / BLOQUE) * BLOQUE));
export const partesDe = (duracion: number) => Math.max(1, Math.round(duracion / BLOQUE));
export const mmss = (s: number) => Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
/** Rango de la parte n (empezando en 1): "0:15–0:30". */
export const rango = (n: number) => mmss((n - 1) * BLOQUE) + "–" + mmss(n * BLOQUE);

/* ------------------------- qué pidió la persona ------------------------- */

export interface Pedido {
  tema: string;
  duracion: number; // segundos, múltiplo de 15
  duracionExplicita: boolean;
  cantidad: number; // cuántos videos distintos
  incluirServicios: boolean;
}

const NUM: Record<string, number> = { un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4 };

/** Lee del texto libre la duración ("1 minuto", "30 s"), cuántos videos y si pide los servicios. */
export function interpretarPedido(texto: string): Pedido {
  const t = texto.toLowerCase();
  let duracion = 60;
  let duracionExplicita = false;

  const min = t.match(/(\d+(?:[.,]\d+)?|un|una|dos|tres|cuatro)\s*(?:minutos?|min)\b/);
  const seg = t.match(/(\d+)\s*(?:segundos?|seg|s)\b/);
  if (/\bmedio\s+minuto\b/.test(t)) {
    duracion = 30;
    duracionExplicita = true;
  } else if (min) {
    const n = NUM[min[1]] ?? parseFloat(min[1].replace(",", "."));
    duracion = aMultiploDe15(n * 60);
    duracionExplicita = true;
  } else if (seg) {
    duracion = aMultiploDe15(Number(seg[1]));
    duracionExplicita = true;
  }

  const v = t.match(/\b(\d+|un|uno|dos|tres)\s+videos?\b/);
  const cantidad = v ? Math.min(MAX_VIDEOS, Math.max(1, NUM[v[1]] ?? Number(v[1]))) : 1;

  return {
    tema: texto.trim(),
    duracion,
    duracionExplicita,
    cantidad,
    incluirServicios: /\bservicios\b/.test(t),
  };
}

/** ¿El texto pide un video nuevo (y no es un ajuste al que ya existe)? */
export function esPedidoNuevo(texto: string): boolean {
  const t = texto.trim().toLowerCase();
  if (/^(cambia|ajusta|corrige|pon|quita|agrega|añade|haz\s+(el|la|que|más|menos)|video\s*\d)/.test(t)) return false;
  return /\b(\d+|un|uno|dos|tres)\s+videos?\b/.test(t) || /\bvideos?\s+(sobre|de\s+\d|para|promocionando)\b/.test(t);
}

/** "video 2: hazlo más formal" → 2. Sin número, devuelve 0. */
export function numeroDeVideoEnAjuste(texto: string): number {
  const t = texto.toLowerCase();
  const m = t.match(/\bvideo\s*(\d)\b/) || t.match(/\b(primer|segundo|tercer)\s+video\b/);
  if (!m) return 0;
  return { primer: 1, segundo: 2, tercer: 3 }[m[1] as "primer"] ?? Number(m[1]);
}

/* ----------------------- reparto de los servicios ----------------------- */

/** Reparte los 7 servicios entre las partes (la última lleva menos: también trae el cierre). */
export function repartirServicios(partes: number): string[][] {
  const base = Math.floor(SERVICIOS.length / partes);
  const resto = SERVICIOS.length % partes;
  const grupos: string[][] = [];
  let i = 0;
  for (let p = 0; p < partes; p++) {
    const n = base + (p < resto ? 1 : 0);
    grupos.push(SERVICIOS.slice(i, i + n).map((s) => s.nombre));
    i += n;
  }
  return grupos;
}

export const serviciosFaltantes = (texto: string) =>
  SERVICIOS.filter((s) => !s.clave.test(texto.toLowerCase())).map((s) => s.nombre);

/* ----------------------------- limpieza ----------------------------- */

/** Quita enlaces markdown y reemplaza el dominio anterior por el sitio oficial. El correo no se toca. */
export function normaliza(t: string): string {
  return t
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/(?:www\.)?montes-a\.com[^\s)"»]*/gi, SITIO_WEB)
    .replace(/(?<![@\w.-])(?:www\.)?montes-a\.com(?![\w.-])/gi, SITIO_WEB);
}

/** Separa las secciones ### GUION, ### PROMPT, ### REDES y ### NOTAS. */
export function secciones(texto: string): Record<string, string> {
  const partes: Record<string, string> = {};
  const regex = /###\s*(GUION|PROMPT|REDES|NOTAS)\s*\n?/gi;
  const marcas: { clave: string; inicio: number; fin: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(texto)) !== null) marcas.push({ clave: m[1].toUpperCase(), inicio: m.index, fin: regex.lastIndex });
  for (let i = 0; i < marcas.length; i++) {
    const fin = i + 1 < marcas.length ? marcas[i + 1].inicio : texto.length;
    partes[marcas[i].clave] = texto.slice(marcas[i].fin, fin).trim();
  }
  return partes;
}

/* ------------------------ del guion a los prompts ------------------------ */

export interface Escena {
  numero: number;
  titulo: string;
  desde: number;
  hasta: number;
  visual: string;
  voz: string;
  pantalla: string;
}

const limpia = (s: string) => s.replace(/\*+/g, "").replace(/^["“«\s]+|["”»\s]+$/g, "").trim();

/** Lee las escenas del guion: "**ESCENA 2: El problema (0:07–0:15)**" + Visual + VOZ EN OFF. */
export function extraerEscenas(guion: string): Escena[] {
  const re = /ESCENA\s*(\d+)\s*:\s*([^(\n]*?)\s*\(\s*(\d+):(\d{2})\s*[–—-]\s*(\d+):(\d{2})\s*\)/gi;
  const marcas: { idx: number; fin: number; numero: number; titulo: string; desde: number; hasta: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(guion)) !== null) {
    marcas.push({
      idx: m.index,
      fin: re.lastIndex,
      numero: Number(m[1]),
      titulo: limpia(m[2]),
      desde: Number(m[3]) * 60 + Number(m[4]),
      hasta: Number(m[5]) * 60 + Number(m[6]),
    });
  }
  return marcas.map((mk, i) => {
    const cuerpo = guion.slice(mk.fin, i + 1 < marcas.length ? marcas[i + 1].idx : guion.length);
    const toma = (r: RegExp) => limpia((cuerpo.match(r) || [])[1] || "");
    return {
      numero: mk.numero,
      titulo: mk.titulo,
      desde: mk.desde,
      hasta: mk.hasta,
      visual: toma(/Visual:?\*{0,2}:?\s*([^\n]+)/i),
      voz: toma(/VOZ EN OFF:?\*{0,2}:?\s*([^\n]+)/i),
      pantalla: toma(/Texto en pantalla:?\*{0,2}:?\s*([^\n]+)/i),
    };
  });
}

export interface ParteVideo {
  numero: number;
  desde: number;
  hasta: number;
  texto: string;
}

const ESTILO =
  "Formato vertical 9:16, 15 segundos. Oficina luminosa y moderna, paleta sobria azul, gris y blanco, luz natural suave, presentador genérico sin rasgos identificables, sin logos externos.";

/** Plan B: arma cada prompt de 15 s a partir de las escenas del guion (si el modelo no los escribió bien). */
export function construirPartes(escenas: Escena[], total: number): string[] | null {
  const salida: string[] = [];
  for (let p = 0; p < total; p++) {
    const a = p * BLOQUE;
    const b = a + BLOQUE;
    const dentro = escenas.filter((e) => e.desde >= a && e.desde < b);
    if (!dentro.length) return null;
    const lineas = dentro.map(
      (e) =>
        "Escena (" + mmss(e.desde) + "–" + mmss(Math.min(e.hasta, b)) + ") " + e.titulo + ". Se ve: " + e.visual + ". " +
        (e.voz ? "Voz en off: «" + e.voz + "». " : "") +
        (e.pantalla ? "Texto en pantalla: «" + e.pantalla + "»." : "")
    );
    salida.push(ESTILO + "\n" + lineas.join("\n"));
  }
  return salida;
}

/** Separa los bloques "#### PARTE n de N" que escribió el modelo dentro de ### PROMPT. */
export function parsearPartes(prompt: string): string[] {
  const re = /####\s*PARTE\s*\d+[^\n]*\n/gi;
  const marcas: { inicio: number; fin: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(prompt)) !== null) marcas.push({ inicio: m.index, fin: re.lastIndex });
  return marcas.map((mk, i) => prompt.slice(mk.fin, i + 1 < marcas.length ? marcas[i + 1].inicio : prompt.length).trim());
}

/** Pone a cada parte su encabezado ("este es el prompt del video 1" / "esta es la continuación") y el cierre fijo. */
export function armarPartes(textos: string[], video: number, totalVideos: number): ParteVideo[] {
  const total = textos.length;
  const etiquetaVideo = totalVideos > 1 || video > 1 ? "VIDEO " + video : "VIDEO";
  return textos.map((cuerpo, i) => {
    const n = i + 1;
    const cabecera =
      n === 1
        ? "ESTE ES EL PROMPT DEL " + etiquetaVideo + " — PARTE 1 de " + total + " (" + rango(1) + ")"
        : "ESTA ES LA CONTINUACIÓN DEL " + etiquetaVideo + " — PARTE " + n + " de " + total + " (" + rango(n) + ")";
    const enlace =
      n === 1
        ? ""
        : "Continúa sin corte la parte anterior: misma oficina, misma paleta, mismo presentador y misma voz.\n";
    let texto = cabecera + "\n" + enlace + normaliza(cuerpo);
    if (n === total) {
      if (!texto.includes(FRASE_CIERRE) || !texto.includes(CONTACTO_CIERRE)) {
        texto += "\nCIERRE: voz en off (con pausa clara en +57, 300, 725, 7266): «" + FRASE_CIERRE + " " + CONTACTO_CIERRE + "» Texto en pantalla: «" + CONTACTO_CIERRE + "», sobre fondo blanco sobrio.";
      }
    }
    return { numero: n, desde: (n - 1) * BLOQUE, hasta: n * BLOQUE, texto };
  });
}
