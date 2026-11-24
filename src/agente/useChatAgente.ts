/* =============================================================
   useChatAgente — estado del asistente
   -------------------------------------------------------------
   Concentra todo el comportamiento del chat: historial, envío en
   hilos de concurrencia, aprendizaje de ideas, propuestas que
   esperan aprobación y generación de video con el avatar.
   ============================================================= */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Conversacion, Idea, Pestana, Propuesta } from "./tipos";
import { LIMITE_CARACTERES, nuevoId } from "./tipos";
import { responderConIdeas } from "./concurrencia";
import {
  avisoFiltrado,
  filtrarDatosPersonales,
  estadoInicial,
  pareceInventarHechos,
} from "./seguridad";
import {
  cargarConversaciones,
  guardarConversaciones,
  cargarIdeas,
  cargarPropuestas,
  guardarPropuestas,
  nuevaConversacion,
} from "./servicioConversaciones";
import { contextoAprendido, marcarUso, registrarIdeas, valorarIdea } from "./aprendizaje";

const URL_VIDEO =
  (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_N8N_WEBHOOK_URL || "";

export interface EstadoAgente {
  conversaciones: Conversacion[];
  activa: Conversacion;
  pestana: Pestana;
  texto: string;
  caracteres: number;
  limite: number;
  enviando: boolean;
  aviso: string;
  ideas: Idea[];
  propuestas: Propuesta[];
  videoPidiendo: boolean;
}

export interface AccionesAgente {
  cambiarTexto: (texto: string) => void;
  cambiarPestana: (pestana: Pestana) => void;
  enviar: () => Promise<void>;
  nuevaConversacion: () => void;
  seleccionar: (id: string) => void;
  borrar: (id: string) => void;
  usarIdea: (id: string) => void;
  valorarIdea: (id: string, util: boolean) => void;
  decidirPropuesta: (id: string, estado: "aprobada" | "rechazada") => void;
  pedirPrompt: (tema: string) => Promise<void>;
}

/** Crea una conversación inicial con el saludo numerado. */
function saludoInicial(): Conversacion {
  const conversacion = nuevaConversacion();
  const ahora = Date.now();
  conversacion.titulo = "Primera conversación";
  conversacion.mensajes = [
    {
      id: nuevoId(),
      rol: "asistente",
      texto:
        "¡Hola! Soy el asistente de Montes Abogados. Elige una opción o escribe lo que necesites:\n\n" +
        "1. Crear una publicación para redes sociales\n" +
        "2. Sugerir 3 ideas de contenido de la semana\n" +
        "3. Escribir el guion de un video con el avatar\n" +
        "4. Redactar una nota de Actualidad Jurídica\n" +
        "5. Proponer prompts para futuras publicaciones\n" +
        "6. Explicar qué tengo pendiente de aprobar",
      creadoEn: ahora,
    },
  ];
  conversacion.actualizadaEn = ahora;
  return conversacion;
}

export function useChatAgente(): EstadoAgente & AccionesAgente {
  const [conversaciones, setConversaciones] = useState<Conversacion[]>(() => {
    const guardadas = cargarConversaciones();
    return guardadas.length ? guardadas : [saludoInicial()];
  });
  const [activaId, setActivaId] = useState<string>(() => {
    const guardadas = cargarConversaciones();
    return guardadas[0]?.id || "";
  });
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState("");
  const [ideas, setIdeas] = useState<Idea[]>(() => cargarIdeas());
  const [propuestas, setPropuestas] = useState<Propuesta[]>(() => cargarPropuestas());
  const [videoPidiendo, setVideoPidiendo] = useState(false);
  const refCaja = useRef<HTMLTextAreaElement | null>(null);

  // Asegura una conversación activa aunque el historial esté vacío.
  useEffect(() => {
    if (conversaciones.length === 0) {
      const nueva = saludoInicial();
      setConversaciones([nueva]);
      setActivaId(nueva.id);
      return;
    }
    if (!conversaciones.some((c) => c.id === activaId)) {
      setActivaId(conversaciones[0].id);
    }
  }, [conversaciones, activaId]);

  const activa = useMemo(
    () => conversaciones.find((c) => c.id === activaId) || conversaciones[0] || saludoInicial(),
    [conversaciones, activaId]
  );

  const pestana = activa.pestana;

  const persistir = useCallback((lista: Conversacion[]) => {
    setConversaciones(lista);
    guardarConversaciones(lista);
  }, []);

  /* ---------------- acciones de conversación ---------------- */

  const cambiarTexto = useCallback((valor: string) => {
    setTexto(valor.slice(0, LIMITE_CARACTERES));
  }, []);

  const cambiarPestana = useCallback(
    (nueva: Pestana) => {
      const lista = conversaciones.map((c) =>
        c.id === activa.id ? { ...c, pestana: nueva, actualizadaEn: Date.now() } : c
      );
      persistir(lista);
    },
    [conversaciones, activa, persistir]
  );

  const crear = useCallback(() => {
    const conversacion = nuevaConversacion(activa.pestana);
    persistir([...conversaciones, conversacion]);
    setActivaId(conversacion.id);
    setTexto("");
    setAviso("");
    refCaja.current?.focus();
  }, [conversaciones, activa.pestana, persistir]);

  const seleccionar = useCallback((id: string) => setActivaId(id), []);

  const borrar = useCallback(
    (id: string) => {
      const lista = conversaciones.filter((c) => c.id !== id);
      persistir(lista);
      if (id === activaId) setActivaId(lista[0]?.id || "");
    },
    [conversaciones, activaId, persistir]
  );

  /* ------------------------- enviar ------------------------- */

  const enviar = useCallback(async () => {
    const bruto = texto.trim();
    if (!bruto || enviando) return;

    if (bruto.length > LIMITE_CARACTERES) {
      setAviso("El mensaje supera los " + LIMITE_CARACTERES + " caracteres.");
      return;
    }

    // Regla 3: nada de datos personales hacia la IA.
    const { texto: limpio, hallazgos } = filtrarDatosPersonales(bruto);
    setAviso(avisoFiltrado(hallazgos));

    const ahora = Date.now();
    const mensajeUsuario = { id: nuevoId(), rol: "usuario" as const, texto: limpio, creadoEn: ahora };
    const historial = [...activa.mensajes, mensajeUsuario];

    const titulo =
      activa.mensajes.length <= 1 ? bruto.slice(0, 46).trim() || "Nueva conversación" : activa.titulo;
    const listaBase = conversaciones.map((c) =>
      c.id === activa.id
        ? { ...c, titulo: titulo, mensajes: historial, actualizadaEn: ahora }
        : c
    );
    persistir(listaBase);
    setTexto("");
    setEnviando(true);

    try {
      const { respuesta, ideas: bloqueIdeas } = await responderConIdeas(
        historial,
        activa.pestana,
        contextoAprendido()
      );

      const textoFinal = pareceInventarHechos(respuesta)
        ? "⚠️ Revisa los hechos: parece que se mencionan datos de un caso concreto. " +
          "Usa sólo información real y aprobada del despacho.\n\n" +
          respuesta
        : respuesta;

      const listaFinal = listaBase.map((c) =>
        c.id === activa.id
          ? {
              ...c,
              mensajes: [
                ...c.mensajes,
                { id: nuevoId(), rol: "asistente" as const, texto: textoFinal, creadoEn: Date.now() },
              ],
              actualizadaEn: Date.now(),
            }
          : c
      );
      persistir(listaFinal);
      setIdeas(registrarIdeas(bloqueIdeas || textoFinal));

      // Regla 2: en Biblioteca y Estilo, la respuesta queda como
      // propuesta "pendiente"; nada se publica sin aprobación.
      if (activa.pestana !== "chat" && textoFinal.length > 40) {
        const nuevaPropuesta: Propuesta = {
          id: nuevoId(),
          texto: textoFinal,
          tipo: activa.pestana === "biblioteca" ? "post" : "guion",
          estado: estadoInicial(),
          creadoEn: Date.now(),
        };
        const lista = [nuevaPropuesta, ...propuestas];
        setPropuestas(lista);
        guardarPropuestas(lista);
      }
    } finally {
      setEnviando(false);
    }
  }, [texto, enviando, activa, conversaciones, persistir, propuestas]);

  /* ------------------- ideas y propuestas ------------------- */

  const usarIdea = useCallback(
    (id: string) => {
      const idea = ideas.find((i) => i.id === id);
      if (!idea) return;
      setIdeas(marcarUso(id));
      setTexto((actual) =>
        (actual ? actual + " " : "") + idea.texto.slice(0, LIMITE_CARACTERES)
      );
      refCaja.current?.focus();
    },
    [ideas]
  );

  const valorar = useCallback((id: string, util: boolean) => {
    setIdeas(valorarIdea(id, util));
  }, []);

  const decidirPropuesta = useCallback(
    (id: string, estado: "aprobada" | "rechazada") => {
      const lista = propuestas.map((p) =>
        p.id === id ? { ...p, estado, creadoEn: p.creadoEn } : p
      );
      setPropuestas(lista);
      guardarPropuestas(lista);
      setAviso(
        estado === "aprobada"
          ? "✅ Propuesta aprobada: ya puede publicarse."
          : "❌ Propuesta rechazada. No se publicará."
      );
    },
    [propuestas]
  );

  /* ------------------ video con el avatar ------------------ */

  /** Pide a la función de Supabase el prompt de Dreamina (30 s) a partir del tema escrito. */
  const pedirPrompt = useCallback(
    async (tema: string) => {
      const limpio = filtrarDatosPersonales(tema).texto.trim();
      if (!limpio) return;
      if (!URL_VIDEO) {
        setAviso("Falta configurar VITE_N8N_WEBHOOK_URL (la función generar-prompt-video).");
        return;
      }
      setVideoPidiendo(true);
      setAviso("✨ Generando el prompt… un momento.");

      const ahora = Date.now();
      const mensajeUsuario = { id: nuevoId(), rol: "usuario" as const, texto: "🎬 Prompt para: " + limpio, creadoEn: ahora };
      const enConversacion = (mensaje: { id: string; rol: "asistente" | "usuario"; texto: string; creadoEn: number }) =>
        conversaciones.map((c) =>
          c.id === activa.id ? { ...c, mensajes: [...c.mensajes, mensaje], actualizadaEn: Date.now() } : c
        );
      persistir(enConversacion(mensajeUsuario));
      setTexto("");

      try {
        const respuesta = await fetch(URL_VIDEO, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tema: limpio, tono: "Cálido y profesional" }),
        });
        const datos = await respuesta.json().catch(() => ({}));

        let textoRespuesta: string;
        if (respuesta.ok && datos.ok) {
          textoRespuesta =
            "PROMPT PARA DREAMINA (30 s)\n" + datos.prompt_dreamina +
            "\n\nGUION DE VOZ\n" + (datos.guion_voz || "—") +
            "\n\nTEXTO PARA REDES\n" + (datos.texto_redes || "—") +
            (datos.notas_revision ? "\n\nNOTAS DE REVISIÓN\n" + datos.notas_revision : "") +
            "\n\nQuedó en Pendientes de aprobación. Cópialo en Dreamina para generar el video.";
          setAviso("✅ Prompt generado. Revísalo y cópialo a Dreamina.");
        } else {
          textoRespuesta =
            "No se pudo generar el prompt: " + (datos.error || "error " + respuesta.status) +
            ". Intenta de nuevo en unos segundos.";
          setAviso("");
        }
        const ahora2 = Date.now();
        const mensajeIA = { id: nuevoId(), rol: "asistente" as const, texto: textoRespuesta, creadoEn: ahora2 };
        persistir(
          conversaciones.map((c) =>
            c.id === activa.id ? { ...c, mensajes: [...c.mensajes, mensajeUsuario, mensajeIA], actualizadaEn: ahora2 } : c
          )
        );
      } catch (error) {
        setAviso("No se pudo conectar con la función: " + (error as Error).message);
      } finally {
        setVideoPidiendo(false);
      }
    },
    [conversaciones, activa.id, persistir]
  );

  return {
    conversaciones,
    activa,
    pestana,
    texto,
    caracteres: texto.length,
    limite: LIMITE_CARACTERES,
    enviando,
    aviso,
    ideas,
    propuestas,
    videoPidiendo,
    cambiarTexto,
    cambiarPestana,
    enviar,
    nuevaConversacion: crear,
    seleccionar,
    borrar,
    usarIdea,
    valorarIdea: valorar,
    decidirPropuesta,
    pedirPrompt,
  };
}
