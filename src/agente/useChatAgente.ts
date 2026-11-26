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
import { esPedidoNuevo, interpretarPedido, numeroDeVideoEnAjuste } from "./pedidoVideo";
import type { Pedido } from "./pedidoVideo";
import { mensajesDeVideos, textoDeVideo } from "./formatoVideo";
import type { VideoRespuesta } from "./formatoVideo";

/** Un mensaje nuevo antes de guardarlo. */
type MensajeNuevo = { id: string; rol: "usuario" | "asistente"; texto: string; creadoEn: number };

/** Preguntas guiadas para crear un video: solo se pide el tema (y, si quieres, duración y cantidad). */
const PREGUNTAS_VIDEO: { clave: string; pregunta: string }[] = [
  {
    clave: "tema",
    pregunta:
      "🎬 ¡Vamos! Cuéntame qué video quieres y yo hago el resto: guion por escenas, prompts de 15 s listos para pegar (parte 1 y sus continuaciones) y texto para redes. " +
      "Puedes decir la duración y cuántos videos, por ejemplo: «2 videos de 1 minuto presentando cada uno de nuestros servicios». Sin duración, el video sale de 60 s.",
  },
];

const ENV = (import.meta as unknown as { env?: Record<string, string> }).env;
const URL_VIDEO = ENV?.VITE_VIDEO_URL || (ENV?.VITE_SUPABASE_URL || "https://rhqtldpiuasrwcwaqrtl.supabase.co") + "/functions/v1/generar-prompt-video";

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
  const [borrador, setBorrador] = useState<{ pedido: Pedido; videos: { numero: number; texto: string }[] } | null>(null);
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
    async (payload: Record<string, unknown>, etiqueta: string, pedido: Pedido, previos: MensajeNuevo[] = []) => {
      if (!URL_VIDEO) {
        setAviso("Falta configurar VITE_VIDEO_URL (la función generar-prompt-video).");
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

        let textos: string[];
        if (respuesta.ok && datos.ok) {
          const videos: VideoRespuesta[] = Array.isArray(datos.videos) ? datos.videos : [];
          if (videos.length) {
            // Un ajuste cambia solo ese video; un pedido nuevo reemplaza todos.
            const previos = payload.correccion && borrador ? borrador.videos : [];
            const nuevos = videos.map((v) => ({ numero: v.numero, texto: textoDeVideo(v) }));
            const unidos = [...previos.filter((p) => !nuevos.some((n) => n.numero === p.numero)), ...nuevos].sort((x, y) => x.numero - y.numero);
            setBorrador({ pedido: pedido, videos: unidos });
            textos = mensajesDeVideos(videos);
            if (Array.isArray(datos.avisos) && datos.avisos.length) textos.push("⚠️ No se pudo generar: " + datos.avisos.join("; ") + ". Pídelo de nuevo.");
          } else {
            // Respuesta de la versión anterior de la función (un solo texto).
            textos = [
              (datos.guion || datos.guion_voz || "(no se recibió el guion; pide el video de nuevo)") +
                "\n\nPROMPT PARA LA HERRAMIENTA DE VIDEO\n" + (datos.prompt_dreamina || "—") +
                "\n\nTEXTO PARA REDES\n" + (datos.texto_redes || "—") +
                (datos.notas_revision ? "\n\nNOTAS DE REVISIÓN\n" + datos.notas_revision : "") +
                "\n\nQuedó en Pendientes de aprobación.",
            ];
            setBorrador({ pedido, videos: [{ numero: 1, texto: textos[0] }] });
          }
          setAviso("✅ Listo. Revisa el guion o pide un ajuste.");
        } else {
          textos = [
            "No pude generar el prompt: " + (datos.error || "error " + respuesta.status) +
              ". Intenta de nuevo en unos segundos.",
          ];
          setAviso("");
        }
        const ahora = Date.now();
        const mensajesIA: MensajeNuevo[] = textos.map((t, i) => ({ id: nuevoId(), rol: "asistente", texto: t, creadoEn: ahora + i }));
        persistir(
          conversaciones.map((c) =>
            c.id === activa.id
              ? { ...c, mensajes: [...c.mensajes, ...previos, mensajeUsuario, ...mensajesIA], actualizadaEn: ahora }
              : c
          )
        );
      } catch (error) {
        setAviso("No se pudo conectar con la función: " + (error as Error).message);
      } finally {
        setVideoPidiendo(false);
      }
    },
    [conversaciones, activa.id, persistir, borrador]
  );

  /** Datos que recibe la función a partir de lo que pidió la persona. */
  const cargaDe = (p: Pedido) => ({
    tema: p.tema,
    duracion: p.duracion,
    cantidad_videos: p.cantidad,
    incluir_servicios: p.incluirServicios,
  });
  const etiquetaDe = (p: Pedido) =>
    "🎬 " + (p.cantidad > 1 ? p.cantidad + " videos" : "Video") + " de " + p.duracion + " s (" + p.duracion / 15 + " prompts de 15 s) sobre: " + p.tema;

  /** Empieza la entrevista del video. Si ya trae un tema, salta esa pregunta. */
  const iniciarVideo = useCallback(
    (temaInicial: string) => {
      setBorrador(null);
      if (temaInicial) {
        setEntrevista(null);
        const pedido = interpretarPedido(temaInicial);
        void generarVideo(cargaDe(pedido), etiquetaDe(pedido), pedido);
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
      const limpio = filtrarDatosPersonales(respuesta).texto.trim();
      if (!limpio) return;
      const ahora = Date.now();
      const datos = { ...entrevista.datos, [clave]: limpio };
      const usuario: MensajeNuevo = { id: nuevoId(), rol: "usuario", texto: limpio, creadoEn: ahora };
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
      const pedido = interpretarPedido(datos.tema);
      await generarVideo(cargaDe(pedido), etiquetaDe(pedido), pedido, [usuario]);
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

  /** Un ajuste a un video ya generado (el texto escrito es la instrucción). */
  const pedirCorreccion = useCallback(
    async (instruccion: string) => {
      const limpio = filtrarDatosPersonales(instruccion).texto.trim();
      if (!limpio || !borrador) return;

      // Con varios videos hay que saber cuál se ajusta.
      let numero = numeroDeVideoEnAjuste(limpio);
      if (!numero && borrador.videos.length === 1) numero = borrador.videos[0].numero;
      const video = borrador.videos.find((v) => v.numero === numero);
      if (!video) {
        agregarMensajes([
          { id: nuevoId(), rol: "usuario", texto: limpio, creadoEn: Date.now() },
          {
            id: nuevoId(),
            rol: "asistente",
            texto: "¿A cuál video va ese ajuste? Escríbelo empezando por el número, por ejemplo «video 2: " + limpio.slice(0, 40) + "».",
            creadoEn: Date.now() + 1,
          },
        ]);
        setTexto("");
        return;
      }

      // Si el ajuste trae otra duración («hazlo de 30 segundos»), el video se rehace con esa duración.
      const nueva = interpretarPedido(limpio);
      const pedido: Pedido = {
        ...borrador.pedido,
        duracion: nueva.duracionExplicita ? nueva.duracion : borrador.pedido.duracion,
      };
      await generarVideo(
        { ...cargaDe(pedido), tema: borrador.pedido.tema, cantidad_videos: borrador.videos.length, numero_video: video.numero, correccion: limpio, borrador: video.texto },
        "✏️ Ajuste al video " + video.numero + ": " + limpio,
        pedido
      );
    },
    [borrador, generarVideo, agregarMensajes]
  );

  /* ------------------------- enviar ------------------------- */

  const enviar = useCallback(async () => {
    const bruto = texto.trim();
    if (!bruto || enviando) return;

    if (entrevista) {
      void avanzarEntrevista(bruto);
      return;
    }
    // Un pedido claro de video («2 videos de 1 minuto sobre…») va directo al generador, haya o no un video anterior.
    if (esPedidoNuevo(bruto)) {
      void pedirPrompt(bruto);
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
  }, [texto, enviando, activa, conversaciones, persistir, propuestas, entrevista, avanzarEntrevista, borrador, pedirCorreccion, pedirPrompt]);

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
