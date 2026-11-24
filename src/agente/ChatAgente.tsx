/* =============================================================
   ChatAgente — asistente de IA dentro del panel de administración
   -------------------------------------------------------------
   Interfaz tipo Fresura: barra lateral de "Historial" con nueva
   conversación y borrado, saludo con menú numerado 1–6, contador 0/2000 y aviso
   de datos personales. Además propone ideas/prompts y deja
   pendientes de aprobación las publicaciones (regla 2).
   ============================================================= */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChatAgente } from "./useChatAgente";
import { AVISO_PRIVACIDAD, MENU_SALUDO } from "./tipos";
import "./estilos-agente.css";

/** URL del avatar (funciona igual en desarrollo y en "salida/"). */
function rutaAvatar(): string {
  const base =
    (import.meta as unknown as { env?: Record<string, string> }).env?.BASE_URL || "./";
  return base.replace(/\/?$/, "/") + "imagenes/agente-avatar.jpg";
}

/** Muestra el botón sólo cuando el panel está desbloqueado. */
function usePanelVisible(): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const panel = document.getElementById("panel");
    if (!panel) return;
    const actualizar = () => setVisible(!panel.classList.contains("oculto"));
    actualizar();
    const observador = new MutationObserver(actualizar);
    observador.observe(panel, { attributes: true, attributeFilter: ["class"] });
    return () => observador.disconnect();
  }, []);
  return visible;
}

function fechaCorta(milisegundos: number): string {
  try {
    return new Date(milisegundos).toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "short",
    });
  } catch {
    return "";
  }
}

export default function ChatAgente() {
  const agente = useChatAgente();
  const panelVisible = usePanelVisible();
  const [abierto, setAbierto] = useState(false);
  const refMensajes = useRef<HTMLDivElement | null>(null);
  const refCaja = useRef<HTMLTextAreaElement | null>(null);

  const {
    activa,
    pestana,
    texto,
    caracteres,
    limite,
    enviando,
    aviso,
    ideas,
    propuestas,
    videoPidiendo,
  } = agente;

  const pendientes = useMemo(
    () => propuestas.filter((p) => p.estado === "pendiente"),
    [propuestas]
  );

  // Baja siempre al último mensaje.
  useEffect(() => {
    const caja = refMensajes.current;
    if (caja) caja.scrollTop = caja.scrollHeight;
  }, [activa.mensajes.length, abierto]);

  // Escape cierra el asistente.
  useEffect(() => {
    const alPulsar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setAbierto(false);
    };
    window.addEventListener("keydown", alPulsar);
    return () => window.removeEventListener("keydown", alPulsar);
  }, []);

  const enviar = useCallback(async () => {
    await agente.enviar();
  }, [agente]);

  const alPulsarEnter = (evento: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (evento.key === "Enter" && !evento.shiftKey) {
      evento.preventDefault();
      void enviar();
    }
  };

  const elegirOpcion = (indice: number) => {
    agente.cambiarTexto(MENU_SALUDO[indice]);
    refCaja.current?.focus();
  };

  return (
    <>
      <button
        type="button"
        className="agente-fab"
        style={{ display: panelVisible || abierto ? "flex" : "none" }}
        onClick={() => setAbierto((valor) => !valor)}
        aria-expanded={abierto}
        aria-label="Abrir el asistente de IA"
      >
        <span className="agente-fab-punto" aria-hidden="true" />
        <img src={rutaAvatar()} alt="" className="agente-fab-avatar" />
        <span className="agente-fab-texto">Asistente IA</span>
        {pendientes.length > 0 && (
          <span className="agente-fab-badge">{pendientes.length}</span>
        )}
      </button>

      <aside
        className={"agente-cajon" + (abierto ? " abierto" : "")}
        aria-hidden={!abierto}
        aria-label="Asistente de inteligencia artificial"
      >
        {/* ---------- Cabecera ---------- */}
        <header className="agente-cabecera">
          <img src={rutaAvatar()} alt="Avatar del asistente" className="agente-avatar" />
          <div className="agente-titulos">
            <strong>Asistente Montes</strong>
            <small>Contenido y redes · siempre pendiente de tu aprobación</small>
          </div>
          <button
            type="button"
            className="agente-cerrar"
            onClick={() => setAbierto(false)}
            aria-label="Cerrar el asistente"
            title="Cerrar"
          >
            ×
          </button>
        </header>

        <div className="agente-cuerpo">
          {/* ---------- Historial ---------- */}
          <div className="agente-historial">
            <button type="button" className="agente-nueva" onClick={agente.nuevaConversacion}>
              + Nueva conversación
            </button>
            <p className="agente-historial-titulo">Historial</p>
            <ul className="agente-lista">
              {agente.conversaciones.map((c) => (
                <li
                  key={c.id}
                  className={"agente-item" + (c.id === activa.id ? " activa" : "")}
                >
                  <button
                    type="button"
                    className="agente-item-botones"
                    onClick={() => agente.seleccionar(c.id)}
                    title={c.titulo}
                  >
                    <span className="agente-item-nombre">{c.titulo}</span>
                    <span className="agente-item-fecha">{fechaCorta(c.actualizadaEn)}</span>
                  </button>
                  <button
                    type="button"
                    className="agente-item-borrar"
                    onClick={() => agente.borrar(c.id)}
                    aria-label={"Borrar " + c.titulo}
                    title="Borrar conversación"
                  >
                    🗑
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* ---------- Sala de conversación ---------- */}
          <div className="agente-sala">
            <div className="agente-mensajes" ref={refMensajes}>
              {activa.mensajes.map((m) => (
                <div key={m.id} className={"agente-mensaje " + m.rol}>
                  {m.rol === "asistente" && (
                    <img src={rutaAvatar()} alt="" className="agente-mensaje-avatar" />
                  )}
                  <div className="agente-globo">
                    {m.texto.split("\n").map((linea, i) => (
                      <p key={i} className={linea.trim() ? undefined : "vacio"}>
                        {linea || "\u00A0"}
                      </p>
                    ))}
                  </div>
                </div>
              ))}

              {enviando && (
                <div className="agente-mensaje asistente">
                  <img src={rutaAvatar()} alt="" className="agente-mensaje-avatar" />
                  <div className="agente-globo agente-pensando">Escribiendo…</div>
                </div>
              )}

              {/* Ideas y prompts aprendidos */}
              {ideas.length > 0 && (
                <section className="agente-ideas">
                  <h4>Ideas y prompts propuestos</h4>
                  <ul>
                    {ideas.slice(-6).map((idea) => (
                      <li key={idea.id} className={idea.util === false ? "descartada" : ""}>
                        <span className="agente-idea-texto">{idea.texto}</span>
                        <span className="agente-idea-acciones">
                          <button
                            type="button"
                            onClick={() => agente.usarIdea(idea.id)}
                            title="Usar en el mensaje"
                          >
                            usar
                          </button>
                          <button
                            type="button"
                            onClick={() => agente.valorarIdea(idea.id, true)}
                            title="Me sirve"
                            aria-pressed={idea.util === true}
                          >
                            👍
                          </button>
                          <button
                            type="button"
                            onClick={() => agente.valorarIdea(idea.id, false)}
                            title="No me sirve"
                            aria-pressed={idea.util === false}
                          >
                            👎
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Propuestas esperando aprobación (regla 2) */}
              {pendientes.length > 0 && (
                <section className="agente-propuestas">
                  <h4>Pendientes de aprobación</h4>
                  {pendientes.map((p) => (
                    <article key={p.id}>
                      <p>{p.texto.slice(0, 220)}{p.texto.length > 220 ? "…" : ""}</p>
                      <div className="agente-propuesta-acciones">
                        <button
                          type="button"
                          onClick={() => agente.decidirPropuesta(p.id, "aprobada")}
                        >
                          Aprobar publicación
                        </button>
                        <button
                          type="button"
                          className="secundario"
                          onClick={() => agente.decidirPropuesta(p.id, "rechazada")}
                        >
                          Rechazar
                        </button>
                      </div>
                    </article>
                  ))}
                </section>
              )}
            </div>

            {/* Menú numerado */}
            <div className="agente-menu">
              {MENU_SALUDO.map((opcion, i) => (
                <button
                  key={opcion}
                  type="button"
                  className="agente-opcion"
                  onClick={() => elegirOpcion(i)}
                  disabled={enviando}
                >
                  <b>{i + 1}.</b> {opcion}
                </button>
              ))}
            </div>

            {aviso && <p className="agente-aviso">{aviso}</p>}

            {/* Caja de texto */}
            <div className="agente-caja">
              <textarea
                ref={refCaja}
                value={texto}
                maxLength={limite}
                rows={3}
                placeholder="Escribe qué necesitas publicar, redactar o explicar…"
                onChange={(evento) => agente.cambiarTexto(evento.target.value)}
                onKeyDown={alPulsarEnter}
                aria-label="Mensaje para el asistente"
              />
              <div className="agente-caja-pie">
                <span className="agente-contador">
                  {caracteres}/{limite}
                </span>
                <span className="agente-privacidad">{AVISO_PRIVACIDAD}</span>
                <button
                  type="button"
                  className="agente-video"
                  onClick={() => void agente.pedirPrompt(texto)}
                  disabled={videoPidiendo || !texto.trim()}
                  title="Genera el prompt de video (30 s) para Dreamina a partir del tema escrito"
                >
                  {videoPidiendo ? "Generando…" : "🎬 Generar prompt"}
                </button>
                <button
                  type="button"
                  className="agente-enviar"
                  onClick={() => void enviar()}
                  disabled={enviando || !texto.trim()}
                >
                  {enviando ? "Enviando…" : "Enviar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
