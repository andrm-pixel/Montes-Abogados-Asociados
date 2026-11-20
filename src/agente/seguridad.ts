/* =============================================================
   SEGURIDAD — LAS 3 REGLAS DEL CLIENTE
   -------------------------------------------------------------
   1) Fotos reales: el contenido propuesto nunca inventa casos.
   2) Nada se publica sin aprobación en la base de datos.
   3) Nunca datos de clientes: esto se filtra ANTES de enviar
      cualquier mensaje al motor de IA.
   ============================================================= */

/** Patrones de datos personales que jamás salen hacia la IA. */
const PATRONES: { nombre: string; regex: RegExp }[] = [
  { nombre: "correo", regex: /[\w.+-]+@[\w-]+\.[\w.-]+/g },
  // Cédula colombiana: 6 a 10 dígitos, con o sin puntos/guiones.
  { nombre: "cédula", regex: /\b\d{1,3}[\.\-]?\d{3}[\.\-]?\d{3}[\.\-]?\d{1,3}\b/g },
  // Teléfonos: +57..., 10 dígitos seguidos, etc.
  { nombre: "teléfono", regex: /(\+?\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}\b/g },
];

export interface TextoSeguro {
  texto: string;
  hallazgos: string[];
}

/**
 * Reemplaza los datos personales por un marcador y devuelve qué
 * encontró, para poder avisar al usuario.
 */
export function filtrarDatosPersonales(entrada: string): TextoSeguro {
  let texto = entrada;
  const hallazgos: string[] = [];

  // Correos primero (para no marcarlos dos veces).
  texto = texto.replace(PATRONES[0].regex, () => {
    if (!hallazgos.includes("correo")) hallazgos.push("correo");
    return "[correo eliminado]";
  });

  // Teléfonos y cédulas: sólo se marcan cadenas con 7+ dígitos
  // en total, para no romper fechas ni números de párrafo.
  for (const patron of PATRONES.slice(1)) {
    texto = texto.replace(patron.regex, (coincidencia) => {
      const digitos = coincidencia.replace(/\D/g, "");
      if (digitos.length < 7) return coincidencia;
      if (!hallazgos.includes(patron.nombre)) hallazgos.push(patron.nombre);
      return "[" + patron.nombre + " eliminado]";
    });
  }

  return { texto, hallazgos };
}

/** Frase de aviso cuando se limpió algo. */
export function avisoFiltrado(hallazgos: string[]): string {
  if (hallazgos.length === 0) return "";
  return (
    "🔒 Antes de enviar detecté " +
    hallazgos.join(", ") +
    " y lo reemplacé por un marcador. Recuerda: " +
    "Evita incluir datos personales de clientes."
  );
}

/**
 * Regla 2: toda propuesta nace en "pendiente". Solo el panel
 * puede pasarla a "aprobada", y únicamente ahí se publica.
 */
export function estadoInicial(): "pendiente" {
  return "pendiente";
}

/** Regla 1: texto con supuestos de caso inventado → no se propone. */
export function pareceInventarHechos(texto: string): boolean {
  const senales = /(cliente\s+\w+\s+\w+|cedula\s+de\s+\w+|caso\s+ganado\s+el|demand[aé]\s+a\s+[\wáéíóú]+)/i;
  return senales.test(texto);
}
