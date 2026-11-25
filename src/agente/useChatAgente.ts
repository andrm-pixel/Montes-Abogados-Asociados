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

/** Un mensaje nuevo antes de guardarlo. */
type MensajeNuevo = { id: string; rol: "usuario" | "asistente"; texto: string; creadoEn: number };

/** Preguntas guiadas para crear un video, en este orden. */
const PREGUNTAS_VIDEO: { clave: string; pregunta: string }[] = [
  {
    clave: "tema",
    pregunta:
      "🎬 ¡Vamos! ¿De qué tema quieres el video? Escríbelo y yo armo el guion completo de 60 segundos por escenas, con voz en off, prompt para la herramienta de video y texto para redes. Por ejemplo: liquidación de prestaciones, despido sin justa causa o recaudo de cartera.",
  },
];

/** Valores por defecto: el administrador solo da el tema. */
const DEFECTOS_VIDEO = {
  duracion: "60",
  puntos_clave: "",
  quien_habla: "",
  tono: "",
  llamada_accion: "",
};

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
  borrarTodo: () => void;
  entrevistaActiva: boolean;
  usarIdea: (id: string) => void;
  valorarIdea: (id: string, util: boolean) => void;
  decidirPropuesta: (id: string, estado: "aprobada" | "rechazada") => void;
  pedirPrompt: (tema: string) => Promise<void>;
  pedirCorreccion: (instruccion: string) => Promise<void>;
  borradorActivo: boolean;
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
  /** Último prompt generado; mientras exista, lo que se escriba es una corrección. */
  const [borrador, setBorrador] = useState<{ tema: string; texto: string } | null>(null);
  /** Entrevista guiada del video: paso actual y respuestas dadas. */
  const [entrevista, setEntrevista] = useState<{ paso: number; datos: Record<string, string> } | null>(null);
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
    conversacion.mensajes = [
      { id: nuevoId(), rol: "asistente", texto: "¡Hola! ¿En qué puedo ayudarte hoy?", creadoEn: Date.now() },
    ];
    persistir([...conversaciones, conversacion]);
    setEntrevista(null);
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

  /** Borra todo el historial y deja una conversación nueva vacía. */
  const borrarTodo = useCallback(() => {
    const nueva = saludoInicial();
    persistir([nueva]);
    setActivaId(nueva.id);
    setBorrador(null);
    setTexto("");
    setAviso("Historial borrado.");
  }, [persistir]);

  /** Añade mensajes a la conversación activa. */
  const agregarMensajes = useCallback(
    (nuevos: MensajeNuevo[]) => {
      const ahora = Date.now();
      persistir(
        conversaciones.map((c) =>
          c.id === activa.id ? { ...c, mensajes: [...c.mensajes, ...nuevos], actualizadaEn: ahora } : c
        )
      );
    },
    [conversaciones, activa.id, persistir]
  );

  /** Llama a la función de video y muestra el resultado en el chat. */
  const generarVideo = useCallback(
    async (payload: Record<string, string>, etiqueta: string, previos: MensajeNuevo[] = []) => {
      if (!URL_VIDEO) {
        setAviso("Falta configurar VITE_N8N_WEBHOOK_URL (la función generar-prompt-video).");
        return;
      }
      setVideoPidiendo(true);
      setAviso("✨ Preparando el prompt… un momento.");

      const mensajeUsuario: MensajeNuevo = { id: nuevoId(), rol: "usuario", texto: etiqueta, creadoEn: Date.now() };
      persistir(
        conversaciones.map((c) =>
          c.id === activa.id
            ? { ...c, mensajes: [...c.mensajes, ...previos, mensajeUsuario], actualizadaEn: Date.now() }
            : c
        )
      );
      setTexto("");

      try {
        const respuesta = await fetch(URL_VIDEO, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const datos = await respuesta.json().catch(() => ({}));

        let textoRespuesta: string;
        if (respuesta.ok && datos.ok) {
          const cuerpoBorrador =
            (datos.guion || "") +
            "\n\nPROMPT PARA LA HERRAMIENTA DE VIDEO\n" + (datos.prompt_dreamina || "") +
            "\n\nTEXTO PARA REDES\n" + (datos.texto_redes || "");
          setBorrador({ tema: payload.tema, texto: cuerpoBorrador });
          textoRespuesta =
            (datos.guion || datos.guion_voz || "(no se recibió el guion; pide el video de nuevo)") +
            "\n\nPROMPT PARA LA HERRAMIENTA DE VIDEO\n" + (datos.prompt_dreamina || "—") +
            "\n\nTEXTO PARA REDES\n" + (datos.texto_redes || "—") +
            (datos.notas_revision ? "\n\nNOTAS DE REVISIÓN\n" + datos.notas_revision : "") +
            "\n\nQuedó en Pendientes de aprobación.\n\n" +
            "¿Quieres cambiar algo? Dime qué ajustar (por ejemplo: el tono, una escena o el cierre) " +
            "y pulsa Enviar. Para un video nuevo, pulsa 🎬 Generar prompt.";
          setAviso("✅ Listo. Revisa el guion o pide un ajuste.");
        } else {
          textoRespuesta =
            "No pude generar el prompt: " + (datos.error || "error " + respuesta.status) +
            ". Intenta de nuevo en unos segundos.";
          setAviso("");
        }
        const ahora = Date.now();
        const mensajeIA: MensajeNuevo = { id: nuevoId(), rol: "asistente", texto: textoRespuesta, creadoEn: ahora };
        persistir(
          conversaciones.map((c) =>
            c.id === activa.id
              ? { ...c, mensajes: [...c.mensajes, ...previos, mensajeUsuario, mensajeIA], actualizadaEn: ahora }
              : c
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

  /** Empieza la entrevista del video. Si ya trae un tema, salta esa pregunta. */
  const iniciarVideo = useCallback(
    (temaInicial: string) => {
      setBorrador(null);
      if (temaInicial) {
        setEntrevista(null);
        void generarVideo(
          { tema: temaInicial, ...DEFECTOS_VIDEO },
          "🎬 Video de " + DEFECTOS_VIDEO.duracion + " s sobre: " + temaInicial
        );
        return;
      }
      const ahora = Date.now();
      setEntrevista({ paso: 0, datos: {} });
      setTexto("");
      agregarMensajes([
        { id: nuevoId(), rol: "asistente", texto: PREGUNTAS_VIDEO[0].pregunta, creadoEn: ahora },
      ]);
    },
    [agregarMensajes, generarVideo]
  );

  /** Recibe la respuesta de la entrevista; cuando están todas, genera el video. */
  const avanzarEntrevista = useCallback(
    async (respuesta: string) => {
      if (!entrevista) return;
      const clave = PREGUNTAS_VIDEO[entrevista.paso].clave;
      let limpio = filtrarDatosPersonales(respuesta).texto.trim();
      if (clave === "duracion") {
        const numero = Number(limpio);
        // Sin respuesta o un valor no válido: 15 segundos por defecto.
        limpio = [15, 30, 60].includes(numero) ? String(numero) : "15";
      }
      if (!limpio) return;
      const ahora = Date.now();
      const datos = { ...entrevista.datos, [clave]: limpio };
      const etiqueta =
        clave === "duracion" && limpio === "15" && !respuesta.trim()
          ? "15 segundos (por defecto)"
          : limpio;
      const usuario: MensajeNuevo = { id: nuevoId(), rol: "usuario", texto: etiqueta, creadoEn: ahora };
      const siguiente = entrevista.paso + 1;
      setTexto("");

      if (siguiente < PREGUNTAS_VIDEO.length) {
        setEntrevista({ paso: siguiente, datos });
        agregarMensajes([
          usuario,
          { id: nuevoId(), rol: "asistente", texto: PREGUNTAS_VIDEO[siguiente].pregunta, creadoEn: ahora + 1 },
        ]);
        return;
      }

      setEntrevista(null);
      await generarVideo(
        {
          tema: datos.tema,
          ...DEFECTOS_VIDEO,
        },
        "🎬 Video de " + DEFECTOS_VIDEO.duracion + " s sobre: " + datos.tema,
        [usuario]
      );
    },
    [entrevista, agregarMensajes, generarVideo]
  );

  /** Botón 🎬 Generar prompt: empieza la entrevista (con el texto escrito como tema, si lo hay). */
  const pedirPrompt = useCallback(
    async (tema: string) => {
      const limpio = filtrarDatosPersonales(tema).texto.trim();
      iniciarVideo(limpio);
    },
    [iniciarVideo]
  );

  /** Una corrección del prompt anterior (el texto escrito es la instrucción). */
  const pedirCorreccion = useCallback(
    async (instruccion: string) => {
      const limpio = filtrarDatosPersonales(instruccion).texto.trim();
      if (!limpio || !borrador) return;
      await generarVideo(
        { tema: borrador.tema, correccion: limpio, borrador: borrador.texto },
        "✏️ Ajuste: " + limpio
      );
    },
    [borrador, generarVideo]
  );

  /* ------------------------- enviar ------------------------- */

  const enviar = useCallback(async () => {
    const bruto = texto.trim();
    if (!bruto || enviando) return;

    if (entrevista) {
      void avanzarEntrevista(bruto);
      return;
    }
    if (borrador) {
      void pedirCorreccion(bruto);
      return;
    }

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
  }, [texto, enviando, activa, conversaciones, persistir, propuestas, entrevista, avanzarEntrevista, borrador, pedirCorreccion]);

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
    borrarTodo,
    entrevistaActiva: entrevista !== null,
    usarIdea,
    valorarIdea: valorar,
    decidirPropuesta,
    pedirPrompt,
    pedirCorreccion,
    borradorActivo: borrador !== null,
  };
}
