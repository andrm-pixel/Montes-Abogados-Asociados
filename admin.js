/* Panel de administración (migrado). React monta el marcado y llama a iniciarAdmin(). */

import {
  hayBackend, perfilActual, esPersonal, entrarPersonal, salir, cambiarClave, pedirRecuperacion,
  listarSolicitudes, cambiarEstadoSolicitud, borrarSolicitud, ESTADOS, ETIQUETA_ESTADO,
} from "./src/lib/cuentas.js";


/* =======================================================
   1. CONFIGURACIÓN
   ======================================================= */

// Contraseña inicial de acceso al panel. SOLO se usa cuando el sitio NO
// está conectado a Supabase (modo sin servidor). Con Supabase conectado,
// el acceso es con correo y contraseña reales y esta clave no sirve.
// Si el administrador la cambia, queda guardada en este computador.
// La clave con la que se entra al panel. Es la de fabrica: conviene
// cambiarla desde la sección 7 (Seguridad) antes de publicar el sitio.
var CLAVE = "montes2026";
// El nombre de usuario del administrador.
var USUARIO = "admin";

// Clave donde se guarda la contraseña nueva del panel
// La clave se guarda con este nombre en el navegador (asi no se
// puede leer con la simple vista del código).
var CLAVE_ADMIN = "claveAdminMontes";

// Devuelve la contraseña con la que se entra: la que se haya cambiado
// o, si nunca se cambio, la inicial.
/* Lee la clave con la que se entra al panel.
   Si el administrador ya la cambio, se usa esa; si no, se usa la de
   fabrica que esta más arriba. */
function leerClaveAdmin() {
  try {
    var guardada = localStorage.getItem(CLAVE_ADMIN);
    if (guardada) {
      return guardada;
    }
  } catch (error) {
    console.log("No se pudo leer la contraseña:", error.message);
  }
  return CLAVE;
}

// Clave donde se guardan los datos en este navegador
// El nombre con el que se guardan los datos del sitio en el navegador.
var LLAVE = "datosMontesSitio";

/* =======================================================
   2. DATOS INICIALES
   Son los mismos del sitio: si edita y guarda, se replacesn.
   ======================================================= */
/* Los datos que trae el panel de fabrica. Se guardan aparte para
   poder completar lo que le falte a los datos que ya están guardados
   en el navegador (por ejemplo, las publicaciones). */
var DATOS_POR_DEFECTO = {
  versionEquipo: 1,
  empresa: {
    nombre: "Montes Abogados Asociados S.A.S.",
    grupo: "Montes Group",
    colorMarca: "#006cb7",
    logo: ""
  },
  contacto: {
    telefono: "+57 300 725 7266",
    correo: "claudia@montes-a.com",
    correoGeneral: "claudia@montes-a.com",
    direccion: "Calle 106 # 58-27, Oficina 706",
    nit: "900.383.659-0",
    direccionEspana: "Calle Monte Esquinza 30, bajo izquierda, 28010",
    sitioWeb: "www.montes-a.com",
    sitioWebEspana: "www.mwabogados.net",
    horario: "Lunes a viernes: 8:00 a.m. - 6:00 p.m.",
    horarioSabado: "Sabados: 8:00 a.m. - 12:00 p.m.",
    whatsappNumero: "573007257266"
  },
  servicios: [
    { titulo: "Derecho Comercial y Contratos", texto: "Asesoramos a empresas en sus operaciones comerciales y en la negociación, redaccion y revision de contratos, para prevenir riesgos y proteger sus intereses." },
    { titulo: "Derecho Laboral y Seguridad Social", texto: "Acompanamos a nuestros clientes en contratación, cumplimiento de obligaciones laborales y de seguridad social, terminaciones y reclamaciones." },
    { titulo: "Derecho Administrativo", texto: "Acompanamos a empresas en sus trámites y actuaciones ante entidades públicas, en la presentación de recursos y en los procesos ante la jurisdicción de lo contencioso administrativo." },
    { titulo: "Derecho Migratorio", texto: "Asesoramos a empresas y a sus colaboradores extranjeros en la obtención de visas y permisos, y en el cumplimiento de sus obligaciones ante Migración Colombia y la Cancillería." },
    { titulo: "Litigio Civil y Comercial", texto: "Representamos a nuestros clientes en procesos judiciales y en mecanismos alternativos de solución de conflictos, con una estrategia clara desde el inicio." },
    { titulo: "Recaudo de Cartera", texto: "Gestionamos el cobro prejurídico y jurídico de obligaciones para ayudar a las empresas a recuperar su cartera de forma eficiente y conforme a la ley." },
    { titulo: "Insolvencia Empresarial", texto: "Representamos a acreedores, personas naturales y jurídicas, en procesos de reorganización, liquidación y demás trámites de insolvencia, para proteger y hacer valer sus créditos." }
  ],
  // Las publicaciones de la sección "Actualidad Jurídica".
  // Cada una puede llevar una imagen y un archivo en PDF adjunto.
  publicaciones: [
    {
      titulo: "Protección constitucional del fuero de salud",
      fecha: "21 de febrero de 2024",
      autora: "Claudia Montes Castro",
      categoria: "Articulos",
      resumen: "Que protege el fuero de salud en Colombia, como se invoca y que pasos deben seguir el trabajador y la empresa cuando se presenta una situación de esta naturaleza.",
      imagen: "",
      pdf: ""
    },
    {
      titulo: "Como preparar una reorganización societaria",
      fecha: "12 de mayo de 2024",
      autora: "Lucy Montes Castro",
      categoria: "Articulos",
      resumen: "Los pasos que conviene revisar antes de una escisión, una fusion o una conversion de la compañía, y los documentos que hay que tener listos.",
      imagen: "",
      pdf: ""
    },
    {
      titulo: "La Ley 2300 de 2023 y las nuevas reglas de contacto en el recaudo de cartera",
      fecha: "3 de septiembre de 2024",
      autora: "Lucy Montes Castro",
      categoria: "Novedades normativas",
      resumen: "Los canales, horarios y la frecuencia que permite la nueva norma en las gestiones de cobranza, y como afecta el manejo de la información del deudor.",
      imagen: "",
      pdf: ""
    }
  ],
  equipo: [
    {
      nombre: "Claudia Marcela Montes Castro", cargo: "Cofundadora y Directora General", iniciales: "CM",
      sinopsis: "Abogada de la Universidad del Rosario y especialista en Derecho Laboral y de la Seguridad Social, con más de doce años de ejercicio profesional. Antes de asumir la dirección de MAA trabajo en la Rama Judicial, donde vio de primera mano como se estudian y se deciden los casos: esa experiencia marca su forma de ejercer y la prepara pensando en como lo va a leer el juez. Cofundo MAA en 2010 junto a Lucy Montes y desde 2018 dirige la firma, donde lidera la asesoría jurídica y la defensa judicial. Se caracteriza por su trato directo, por explicar con claridad los riesgos y las opciones de cada caso y por acompañar a sus clientes de principio a fin, con amplia experiencia en empresas multinacionales y en negocios internacionales."
    },
    {
      nombre: "Lucy Montes Castro", cargo: "Cofundadora", iniciales: "LM",
      sinopsis: "Abogada de la Universidad Libre, especialista en Derecho Administrativo de la misma universidad y en Derecho Tributario de la Universidad del Rosario. Cofundo MAA en 2010 junto a Claudia Montes. Su formación en derecho administrativo y tributario complementa la práctica de la firma y aporta una visión clave para las empresas en su relación con el Estado y con las autoridades tributarias. Se caracteriza por su capacidad para anticipar los efectos de una decision pública sobre la operación de una empresa y por su compromiso con un trabajo riguroso, ordenado y cercano al cliente."
    },
    {
      nombre: "Jorge Montes Castro", cargo: "Asociado Senior", iniciales: "JM",
      sinopsis: "Abogado especializado en derecho comercial, con experiencia en la gestión de cartera y en cobranza prejurídica y judicial, en negociación de relacionamientos comerciales y en la revision y negociación de contratos. Se caracteriza por su conocimiento práctico del cobro, por su capacidad para diseñar rutas de recuperación que respetan la ley y por su compromiso con el cumplimiento de los términos procesales y con el resultado de la firma."
    },
    {
      nombre: "Daniel Bertel Paternina", cargo: "Auxiliar Jurídico", iniciales: "DB",
      sinopsis: "Profesional en formación en Derecho, actualmente cursando IV semestre, con experiencia en apoyo jurídico, revision de expedientes, seguimiento de procesos judiciales y elaboración de documentos jurídicos. Se caracteriza por su organización, responsabilidad y capacidad de análisis jurídico, asi como por su compromiso con el cumplimiento de los términos procesales y el desarrollo eficiente de las actividades propias del ámbito legal."
    },
    {
      nombre: "Laura Catalina Urrego Sastre", cargo: "Abogada", iniciales: "LU",
      sinopsis: "Abogada de la Universidad Militar Nueva Granada, actualmente cursa la Especializacion en Derecho Empresarial y de los Negocios en la Universidad del Rosario. Su práctica se centra en el derecho civil, comercial, laboral y en la contratación estatal. Tiene experiencia en asesoría jurídica corporativa, elaboración y revision de contratos, emision de conceptos jurídicos, litigios y recuperación de cartera en todas sus etapas. Ha acompañado a empresas del sector de la construcción e infraestructura en la estructuración y ejecución de proyectos, manejo de polizas y garantias, procesos de contratación pública y atención de requerimientos de organos de control. Ha apoyado también asuntos laborales y reclamaciones ante aseguradoras. Se destaca por su asesoría jurídica integral y por su compromiso con la calidad en cada asunto."
    }
  ]
};

/* =======================================================
   3. UTILIDADES
   ======================================================= */

// La copia de trabajo: es la que se edita y la que se guarda.
var DATOS = clonarObjeto(DATOS_POR_DEFECTO);

/* Vuelve los datos de trabajo a los de fabrica. Lo usan las pruebas
   para que cada caso empiece limpio, sin datos del caso anterior. */
export function reiniciarDatos() {
  DATOS = clonarObjeto(DATOS_POR_DEFECTO);
}

/* El atajo para buscar un elemento por su id: $( "nombre" ).
   Es una forma corta de escribir document.getElementById(). */
function $(id) {
  return document.getElementById(id);
}

/* Muestra un aviso en la parte de arriba del panel.
   "tipo" puede ser "ok" (verde) o "error" (rojo). */
function mostrarAviso(texto, tipo) {
  var aviso = $("aviso");
  aviso.textContent = texto;
  aviso.className = "aviso " + tipo;
  window.scrollTo(0, 0);
}

/* Copia un objeto: sirve para trabajar sobre una copia sin tocar
   el original (por ejemplo, para poder deshacer un cambio). */
function clonarObjeto(objeto) {
  return JSON.parse(JSON.stringify(objeto));
}

/* =======================================================
   4. GUARDAR Y CARGAR
   ======================================================= */

/* Guarda los cambios en el navegador.
   Además baja un archivo con toda la información, que es el que hay
   que subir al alojamiento para que los cambios se vean en internet. */
function guardar() {
  // Se leen los campos simples del formulario
  DATOS.empresa.nombre = $("nombre").value;
  DATOS.empresa.grupo = $("grupo").value;
  DATOS.empresa.colorMarca = $("colorMarca").value;

  DATOS.contacto.telefono = $("telefono").value;
  DATOS.contacto.correo = $("correo").value;
  DATOS.contacto.direccion = $("direccion").value;
  DATOS.contacto.direccionEspana = $("direccionEspana").value;
  DATOS.contacto.sitioWeb = $("sitioWeb").value;
  DATOS.contacto.sitioWebEspana = $("sitioWebEspana").value;
  DATOS.contacto.horario = $("horario").value;
  DATOS.contacto.horarioSabado = $("horarioSabado").value;
  DATOS.contacto.whatsappNumero = $("whatsappNumero").value;

  // Las publicaciones también se guardan.
  if ($("listaPublicaciones")) {
    leerListaPublicaciones();
  }

  // El carrusel también se guarda.
  leerListaCarrusel();

  // El carrusel siempre queda como lista, aunque este vacía: asi un
  // guardado nunca puede borrar las imágenes del carrusel.
  if (!Array.isArray(DATOS.carrusel)) {
    DATOS.carrusel = [];
  }

  // Las traducciones automaticas se guardan junto con los datos.
  if (!DATOS.traducciones || typeof DATOS.traducciones !== "object") {
    DATOS.traducciones = {};
  }

  // Se anota la fecha y hora del guardado. Asi el sitio y el panel
  // saben que estos datos son más nuevos que los de datos.json.
  DATOS.fechaActualizacion = new Date().toISOString();

  try {
    localStorage.setItem(LLAVE, JSON.stringify(DATOS));
    mostrarAviso("Cambios guardados. Ya puede ver el sitio con la información nueva.", "ok");
    // Se traducen al inglés los textos en español que cambiaron,
    // para que la version en inglés del sitio quede al día.
    traducirContenidoEditado();
  } catch (error) {
    mostrarAviso("No se pudo guardar: " + error.message, "error");
  }
}

/* Carga los datos guardados en el navegador y los pone en los
   formularios del panel. */
function cargar() {
  var guardado = null;
  try {
    guardado = localStorage.getItem(LLAVE);
  } catch (error) {
    guardado = null;
  }

  /* Primero se decide con que datos se abre el panel: si el archivo
     datos.json publicado es más nuevo que lo guardado en este
     navegador, se usa el publicado. Asi el panel siempre muestra la
     última version (por ejemplo, las imágenes nuevas del carrusel)
     aunque el navegador tenga una copia vieja. */
  elegirDatosIniciales(guardado).then(function (texto) {
    cargarDesde(texto);
  });
}

/* Baja datos.json y devuelve el texto con el que hay que abrir el
   panel: el publicado si es más nuevo, o lo guardado en el navegador
   en caso contrario. Si no hay datos.json (por ejemplo, cuando el
   sitio se abre como archivo local), se queda lo guardado. */
function elegirDatosIniciales(guardado) {
  var bajada = Promise.resolve(null);
  try {
    if (typeof fetch === "function") {
      bajada = fetch("datos.json", { cache: "no-store" })
        .then(function (respuesta) {
          return respuesta.ok ? respuesta.json() : null;
        })
        .catch(function () {
          return null;
        });
    }
  } catch (error) {
    bajada = Promise.resolve(null);
  }

  return bajada.then(function (publicado) {
    if (!publicado) {
      return guardado;
    }
    var local = null;
    try {
      local = guardado ? JSON.parse(guardado) : null;
    } catch (error) {
      local = null;
    }
    if (publicadoEsMasNuevo(publicado, local)) {
      return JSON.stringify(publicado);
    }
    return guardado;
  });
}

/* Dice si el archivo publicado es más reciente que lo guardado en
   este navegador. Misma regla que usa la página del sitio. */
function publicadoEsMasNuevo(publicado, local) {
  if (!local) {
    return true;
  }
  var fechaPublicado = publicado.fechaActualizacion || "";
  var fechaLocal = local.fechaActualizacion || "";
  if (!fechaPublicado) {
    return false;
  }
  if (!fechaLocal) {
    return true;
  }
  return fechaPublicado > fechaLocal;
}

/* Pinta el panel con los datos que se eligieron. */
function cargarDesde(guardado) {
  /* Dice si el carrusel ya venia guardado en este navegador. Si no
     venia, se toma el publicado en datos.json para poder editarlo. */
  var carruselGuardado = false;

  if (guardado) {
    try {
      DATOS = JSON.parse(guardado);
    } catch (error) {
      console.log("Los datos guardados no se pudieron leer:", error.message);
      DATOS = clonarObjeto(DATOS_POR_DEFECTO);
    }

    carruselGuardado = !!(DATOS && Array.isArray(DATOS.carrusel));

    /* Protección: si los datos guardados vienen incompletos (por
       ejemplo, solo con el carrusel), se completa cada sección que
       falte con los datos de fabrica. Asi el panel nunca falla al
       abrir y siempre se pueden editar las areas de servicio, los
       integrantes del equipo y el carrusel de imágenes. */
    if (!DATOS || typeof DATOS !== "object") {
      DATOS = clonarObjeto(DATOS_POR_DEFECTO);
    } else {
      var faltanDatos = false;

      if (!DATOS.empresa || typeof DATOS.empresa !== "object") {
        DATOS.empresa = clonarObjeto(DATOS_POR_DEFECTO.empresa);
        faltanDatos = true;
      } else {
        for (var claveEmpresa in DATOS_POR_DEFECTO.empresa) {
          if (DATOS.empresa[claveEmpresa] === undefined) {
            DATOS.empresa[claveEmpresa] = DATOS_POR_DEFECTO.empresa[claveEmpresa];
            faltanDatos = true;
          }
        }
      }

      if (!DATOS.contacto || typeof DATOS.contacto !== "object") {
        DATOS.contacto = clonarObjeto(DATOS_POR_DEFECTO.contacto);
        faltanDatos = true;
      } else {
        for (var claveContacto in DATOS_POR_DEFECTO.contacto) {
          if (DATOS.contacto[claveContacto] === undefined) {
            DATOS.contacto[claveContacto] = DATOS_POR_DEFECTO.contacto[claveContacto];
            faltanDatos = true;
          }
        }
      }

      if (!Array.isArray(DATOS.servicios)) {
        DATOS.servicios = clonarObjeto(DATOS_POR_DEFECTO.servicios);
        faltanDatos = true;
      }

      if (!Array.isArray(DATOS.equipo)) {
        DATOS.equipo = clonarObjeto(DATOS_POR_DEFECTO.equipo);
        faltanDatos = true;
      }

      if (!Array.isArray(DATOS.publicaciones)) {
        DATOS.publicaciones = clonarObjeto(DATOS_POR_DEFECTO.publicaciones);
        faltanDatos = true;
      }

      if (!Array.isArray(DATOS.carrusel)) {
        DATOS.carrusel = [];
        faltanDatos = true;
      }

      if (faltanDatos) {
        try {
          localStorage.setItem(LLAVE, JSON.stringify(DATOS));
        } catch (error) {
          console.log("No se pudo completar la información guardada:", error.message);
        }
      }
    }

    if (!DATOS.versionEquipo) {
      if (Array.isArray(DATOS.equipo) && DATOS.equipo.length) {
        var tieneLaura = false;
        for (var i = 0; i < DATOS.equipo.length; i++) {
          if (DATOS.equipo[i].nombre === "Laura Catalina Urrego Sastre") {
            tieneLaura = true;
            break;
          }
        }

        if (!tieneLaura) {
          for (var j = 0; j < DATOS_POR_DEFECTO.equipo.length; j++) {
            var personaPredeterminada = DATOS_POR_DEFECTO.equipo[j];
            if (personaPredeterminada.nombre === "Laura Catalina Urrego Sastre") {
              DATOS.equipo.push(clonarObjeto(personaPredeterminada));
              break;
            }
          }
        }
      }

      DATOS.versionEquipo = 1;
      try {
        localStorage.setItem(LLAVE, JSON.stringify(DATOS));
      } catch (error) {
        console.log("No se pudo guardar la actualizacion del equipo:", error.message);
      }
    }

    // Se completa lo que no estuviera en los datos guardados (por ejemplo,
    // las publicaciones, que se agregaron después de la primera version).
    if (!DATOS.publicaciones || !DATOS.publicaciones.length) {
      DATOS.publicaciones = clonarObjeto(DATOS_POR_DEFECTO.publicaciones);
    }
  }

  // Se llenan los campos
  $("nombre").value = DATOS.empresa.nombre;
  $("grupo").value = DATOS.empresa.grupo;
  $("colorMarca").value = DATOS.empresa.colorMarca;
  $("colorMarcaTexto").value = DATOS.empresa.colorMarca;

  $("telefono").value = DATOS.contacto.telefono;
  $("correo").value = DATOS.contacto.correo;
  $("direccion").value = DATOS.contacto.direccion;
  $("direccionEspana").value = DATOS.contacto.direccionEspana;
  $("sitioWeb").value = DATOS.contacto.sitioWeb;
  $("sitioWebEspana").value = DATOS.contacto.sitioWebEspana;
  $("horario").value = DATOS.contacto.horario;
  $("horarioSabado").value = DATOS.contacto.horarioSabado;
  $("whatsappNumero").value = DATOS.contacto.whatsappNumero;

  mostrarListaServicios();
  mostrarListaEquipo();
  mostrarListaPublicaciones();
  mostrarListaCarrusel();
  mostrarLogo();
  mostrarSolicitudes();

  // Si este navegador no tiene carrusel guardado, se toma el que
  // esta publicado en datos.json para poder editarlo desde aquí.
  if (!carruselGuardado) {
    cargarCarruselPublicado();
  }
}

/* Baja el carrusel publicado en datos.json y lo deja en el panel
   para que se pueda editar (cambiar imágenes, textos y orden).
   Si no hay datos.json, simplemente queda el carrusel vacío y se
   pueden agregar diapositivas a mano con "Agregar diapositiva". */
function cargarCarruselPublicado() {
  try {
    if (typeof fetch !== "function") return;
    fetch("datos.json", { cache: "no-store" })
      .then(function (respuesta) {
        return respuesta.ok ? respuesta.json() : null;
      })
      .then(function (datos) {
        if (!datos || !Array.isArray(datos.carrusel)) return;

        var conImagen = [];
        for (var i = 0; i < datos.carrusel.length; i++) {
          if (datos.carrusel[i] && datos.carrusel[i].imagen) {
            conImagen.push(datos.carrusel[i]);
          }
        }

        // Solo se completa si todavía no hay diapositivas en el panel.
        if (!conImagen.length || (DATOS.carrusel && DATOS.carrusel.length)) return;

        DATOS.carrusel = clonarObjeto(conImagen);
        mostrarListaCarrusel();

        try {
          localStorage.setItem(LLAVE, JSON.stringify(DATOS));
        } catch (error) {
          console.log("No se pudo guardar el carrusel publicado:", error.message);
        }
      })
      .catch(function () {
        // Sin datos.json (archivo local): se queda el carrusel vacío.
      });
  } catch (error) {
    console.log("No se pudo leer datos.json:", error.message);
  }
}

/* =======================================================
   4b. TRADUCCIÓN AUTOMÁTICA AL INGLÉS
   Cuando el dueno escribe un texto en español, el panel lo
   traduce solo y lo guarda en "traducciones", que es lo que
   usa el sitio para mostrar la version en inglés al día.
   ======================================================= */

/* Traduce un texto de español a inglés con servicios gratuitos en
   linea (Google y, si ese no responde, MyMemory). Devuelve una
   promesa con el texto traducido, o null si no hay internet. */
function traducirTexto(texto) {
  var urlGoogle =
    "https://translate.googleapis.com/translate_a/single?client=gtx&sl=es&tl=en&dt=t&q=" +
    encodeURIComponent(texto);

  var porGoogle = fetch(urlGoogle)
    .then(function (respuesta) {
      return respuesta.ok ? respuesta.json() : Promise.reject();
    })
    .then(function (datos) {
      // Google responde una lista de pedacitos: [[["Hola","Hello",...]]]
      if (Array.isArray(datos) && Array.isArray(datos[0])) {
        var parte = datos[0].map(function (fila) { return fila[0] || ""; }).join("");
        if (parte.trim()) return parte.trim();
      }
      return Promise.reject();
    });

  var porMyMemory = function () {
    var url =
      "https://api.mymemory.translated.net/get?langpair=es%7Cen&q=" +
      encodeURIComponent(texto);
    return fetch(url)
      .then(function (respuesta) {
        return respuesta.ok ? respuesta.json() : Promise.reject();
      })
      .then(function (datos) {
        if (datos && datos.responseData && datos.responseData.translatedText) {
          return String(datos.responseData.translatedText).trim();
        }
        return Promise.reject();
      });
  };

  return porGoogle
    .catch(porMyMemory)
    .catch(function () {
      return null;
    });
}

/* Traduce el título o el subtítulo de una imagen del carrusel
   cuando el usuario termina de escribirlo en español. El campo en
   inglés solo se llena si esta vacío o si lo lleno la traducción:
   si el usuario lo escribio a mano, no se toca. */
function traducirCampoDiapositiva(indice, tipo) {
  if (typeof fetch !== "function") return;

  var idOrigen = tipo === "titulo" ? "carTitulo" + indice : "carTexto" + indice;
  var idDestino = tipo === "titulo" ? "carTituloEn" + indice : "carTextoEn" + indice;
  var campoOrigen = $(idOrigen);
  var campoDestino = $(idDestino);
  if (!campoOrigen || !campoDestino) return;

  var texto = campoOrigen.value.trim();
  if (!texto) return;

  var marca = tipo === "titulo" ? "autoTituloEn" : "autoTextoEn";
  var puestoPorTraduccion = !!(DATOS.carrusel[indice] && DATOS.carrusel[indice][marca]);

  if (campoDestino.value.trim() && !puestoPorTraduccion) return;

  traducirTexto(texto).then(function (traduccion) {
    if (!traduccion) return;
    if (campoDestino.value.trim() && !puestoPorTraduccion) return;
    campoDestino.value = traduccion;
    if (DATOS.carrusel[indice]) DATOS.carrusel[indice][marca] = true;
  });
}

/* Lista todos los textos en español del sitio que se pueden
   traducir, con la llave que usa el sitio en inglés. */
function listarTextosTraducibles() {
  var lista = [];
  var i;

  if (DATOS.empresa && DATOS.empresa.nombre) {
    lista.push({ clave: "banner.titulo", es: DATOS.empresa.nombre });
  }

  for (i = 0; i < (DATOS.servicios || []).length; i++) {
    if (DATOS.servicios[i].titulo) {
      lista.push({ clave: "servicios." + i + ".titulo", es: DATOS.servicios[i].titulo });
    }
    if (DATOS.servicios[i].texto) {
      lista.push({ clave: "servicios." + i + ".texto", es: DATOS.servicios[i].texto });
    }
  }

  for (i = 0; i < (DATOS.equipo || []).length; i++) {
    if (DATOS.equipo[i].nombre) {
      lista.push({ clave: "equipo." + i + ".nombre", es: DATOS.equipo[i].nombre });
    }
    if (DATOS.equipo[i].cargo) {
      lista.push({ clave: "equipo." + i + ".cargo", es: DATOS.equipo[i].cargo });
    }
    if (DATOS.equipo[i].sinopsis) {
      lista.push({ clave: "equipo." + i + ".sinopsis", es: DATOS.equipo[i].sinopsis });
    }
  }

  for (i = 0; i < (DATOS.publicaciones || []).length; i++) {
    var publicacion = DATOS.publicaciones[i];
    if (publicacion.titulo) {
      lista.push({ clave: "actualidad." + i + ".titulo", es: publicacion.titulo });
    }
    if (publicacion.resumen) {
      lista.push({ clave: "actualidad." + i + ".resumen", es: publicacion.resumen });
    }
    if (publicacion.categoria) {
      lista.push({ clave: "actualidad." + i + ".categoria", es: publicacion.categoria });
    }
    if (publicacion.autora) {
      lista.push({ clave: "actualidad." + i + ".autora", es: publicacion.autora });
    }
    if (publicacion.fecha) {
      lista.push({ clave: "actualidad." + i + ".fecha", es: publicacion.fecha });
    }
  }

  return lista;
}

/* Traduce al inglés los textos que cambiaron desde la última vez.
   Solo se traduce lo que cambio, una traducción tras otra, para no
   saturar el servicio gratuito. Cada resultado queda guardado en
   DATOS.traducciones con el texto en español del que salio, de modo
   que si después se edita el español, la traducción se refresca. */
function traducirContenidoEditado() {
  if (typeof fetch !== "function") return;
  if (!DATOS.traducciones || typeof DATOS.traducciones !== "object") {
    DATOS.traducciones = {};
  }

  var pendientes = listarTextosTraducibles().filter(function (texto) {
    var guardada = DATOS.traducciones[texto.clave];
    return !guardada || guardada.es !== texto.es || !guardada.en;
  });

  if (!pendientes.length) return;

  pendientes.reduce(function (cadena, texto) {
    return cadena.then(function () {
      return traducirTexto(texto.es).then(function (traduccion) {
        if (!traduccion) return;
        DATOS.traducciones[texto.clave] = { es: texto.es, en: traduccion };
        try {
          localStorage.setItem(LLAVE, JSON.stringify(DATOS));
        } catch (error) {
          console.log("No se pudo guardar la traducción:", error.message);
        }
      });
    });
  }, Promise.resolve());
}

/* Vuelve a poner los datos de fabrica: deshace todos los cambios. */
function restablecer() {
  if (!window.confirm("Se van a borrar los cambios guardados en este computador y la página volvera a su estado original. Continuar?")) {
    return;
  }
  try {
    localStorage.removeItem(LLAVE);
  } catch (error) {
    console.log("No se pudo limpiar:", error.message);
  }
  location.reload();
}

/* =======================================================
   5. SERVICIOS Y EQUIPO (LISTAS EDITABLES)
   ======================================================= */

/* Dibuja la lista de areas de práctica, cada una con su título,
   su descripción y un botón para quitarla. */
function mostrarListaServicios() {
  var html = "";
  for (var i = 0; i < DATOS.servicios.length; i++) {
    html += `
      <div class="item">
        <div class="fila">
          <div class="campo">
            <label>Título</label>
            <input type="text" id="servTitulo${i}" value="${escapar(DATOS.servicios[i].titulo)}">
          </div>
          <div class="campo">
            <label>Acciones</label>
            <button class="peligro" onclick="quitarServicio(${i})">Quitar esta área</button>
          </div>
        </div>
        <div class="campo">
          <label>Descripción</label>
          <textarea id="servTexto${i}">${escapar(DATOS.servicios[i].texto)}</textarea>
        </div>
      </div>`;
  }
  $("listaServicios").innerHTML = html;
}

/* Lee lo que se escribio en cada área y lo guarda en DATOS. */
function leerListaServicios() {
  for (var i = 0; i < DATOS.servicios.length; i++) {
    // Si el campo no esta en pantalla (por ejemplo, sin iniciar sesión),
    // se conserva lo que ya tiene guardado ese servicio.
    var titulo = $("servTitulo" + i);
    var texto = $("servTexto" + i);
    if (titulo) DATOS.servicios[i].titulo = titulo.value;
    if (texto) DATOS.servicios[i].texto = texto.value;
  }
}

/* Quita un área de la lista de areas de práctica. */
function quitarServicio(indice) {
  if (!window.confirm("Quitar esta área de servicio?")) return;
  leerListaServicios();
  DATOS.servicios.splice(indice, 1);
  mostrarListaServicios();
}

/* Agrega un área de práctica vacía, para que la firma la escriba. */
function agregarServicio() {
  leerListaServicios();
  DATOS.servicios.push({ titulo: "Nueva área", texto: "Descripción del servicio." });
  mostrarListaServicios();
}

// Las cuatro categorías que usa la sección de actualidad jurídica.
// Las cuatro categorías de la sección de actualidad jurídica: son los
// mismos filtros que usa el sitio.
var CATEGORIAS = ["Articulos", "Jurisprudencia", "Novedades normativas", "Notas de prensa"];

// Muestra las publicaciones con un formulario para cada una.
function mostrarListaPublicaciones() {
  if (!DATOS.publicaciones) {
    DATOS.publicaciones = [];
  }
  var html = "";
  for (var i = 0; i < DATOS.publicaciones.length; i++) {
    var publicacion = DATOS.publicaciones[i];
    var opciones = "";
    for (var c = 0; c < CATEGORIAS.length; c++) {
      var marcada = (CATEGORIAS[c] === publicacion.categoria) ? " selected" : "";
      opciones += `<option value="${CATEGORIAS[c]}"${marcada}>${CATEGORIAS[c]}</option>`;
    }
    var vistaImagen = publicacion.imagen
      ? `<img src="${publicacion.imagen}" alt="Imagen de la publicacion" class="miniatura">`
      : `<span class="pista">Sin imagen</span>`;
    var vistaPdf = publicacion.pdf
      ? `<span class="pista">Archivo adjunto: ${escapar(publicacion.pdf)}</span>`
      : `<span class="pista">Sin archivo en PDF</span>`;

    html += `
      <div class="item">
        <div class="fila">
          <div class="campo">
            <label>Título</label>
            <input type="text" id="pubTitulo${i}" value="${escapar(publicacion.titulo)}">
          </div>
          <div class="campo">
            <label>Acciones</label>
            <button class="peligro" onclick="quitarPublicacion(${i})">Quitar esta publicación</button>
          </div>
        </div>
        <div class="fila">
          <div class="campo">
            <label>Fecha</label>
            <input type="text" id="pubFecha${i}" value="${escapar(publicacion.fecha)}" placeholder="21 de febrero de 2024">
          </div>
          <div class="campo">
            <label>Autora</label>
            <input type="text" id="pubAutora${i}" value="${escapar(publicacion.autora)}" placeholder="Claudia Montes Castro">
          </div>
          <div class="campo">
            <label>Categoría</label>
            <select id="pubCategoria${i}">${opciones}</select>
          </div>
        </div>
        <div class="campo">
          <label>Resumen (dos lineas)</label>
          <textarea id="pubResumen${i}">${escapar(publicacion.resumen)}</textarea>
        </div>
        <div class="fila">
          <div class="campo">
            <label>Imagen de la publicación</label>
            <input type="file" id="pubImagen${i}" accept="image/*" class="entrada-archivo">
            <label class="boton-archivo" for="pubImagen${i}">Agregar imagen</label>
            <span class="nombre-archivo" id="pubImagenNombre${i}">${publicacion.imagen ? "Imagen cargada" : "Ninguna imagen seleccionada"}</span>
            <div id="pubImagenVista${i}" class="vista-imagen">${vistaImagen}</div>
          </div>
          <div class="campo">
            <label>Archivo o documento (PDF)</label>
            <input type="file" id="pubPdf${i}" accept="application/pdf" class="entrada-archivo">
            <label class="boton-archivo" for="pubPdf${i}">Agregar archivo o documento</label>
            <span class="nombre-archivo" id="pubPdfNombre${i}">${publicacion.pdf ? escapar(publicacion.pdf) : "Ningún archivo adjunto"}</span>
            <div id="pubPdfVista${i}" class="vista-pdf">${vistaPdf}</div>
          </div>
        </div>
      </div>`;
  }
  $("listaPublicaciones").innerHTML = html;

  // Al elegir una imagen se muestra de una vez.
  for (var k = 0; k < DATOS.publicaciones.length; k++) {
    (function (indice) {
      var campoImagen = $("pubImagen" + indice);
      if (campoImagen) {
        campoImagen.addEventListener("change", function () {
          var archivo = this.files && this.files[0];
          if (!archivo) return;
          if (archivo.size > 900000) {
            mostrarAviso("Esa imagen es muy pesada. Use una imagen de menos de 900 KB.", "error");
            return;
          }
          if ($("pubImagenNombre" + indice)) {
            $("pubImagenNombre" + indice).textContent = archivo.name;
          }
          var lector = new FileReader();
          lector.onload = function (evento) {
            DATOS.publicaciones[indice].imagen = evento.target.result;
            $("pubImagenVista" + indice).innerHTML =
              `<img src="${evento.target.result}" alt="Imagen de la publicación" class="miniatura">`;
          };
          lector.readAsDataURL(archivo);
        });
      }

      var campoPdf = $("pubPdf" + indice);
      if (campoPdf) {
        campoPdf.addEventListener("change", function () {
          var archivo = this.files && this.files[0];
          if (!archivo) return;
          // El PDF no se copia dentro del sitio (ocuparia demasiado): se
          // guarda el nombre y la firma lo sube a la carpeta documentos.
          DATOS.publicaciones[indice].pdf = archivo.name;
          if ($("pubPdfNombre" + indice)) {
            $("pubPdfNombre" + indice).textContent = archivo.name;
          }
          $("pubPdfVista" + indice).innerHTML =
            `<span class="pista">Archivo adjunto: ${escapar(archivo.name)}</span>`;
        });
      }
    })(k);
  }
}

// Lee los campos de cada publicación y los guarda en DATOS.
/* Lee lo que se escribio en cada publicación y lo guarda en DATOS. */
function leerListaPublicaciones() {
  for (var i = 0; i < DATOS.publicaciones.length; i++) {
    // Si el campo no esta en pantalla, se conserva lo ya guardado.
    var titulo = $("pubTitulo" + i);
    var fecha = $("pubFecha" + i);
    var autora = $("pubAutora" + i);
    var categoria = $("pubCategoria" + i);
    var resumen = $("pubResumen" + i);
    if (titulo) DATOS.publicaciones[i].titulo = titulo.value;
    if (fecha) DATOS.publicaciones[i].fecha = fecha.value;
    if (autora) DATOS.publicaciones[i].autora = autora.value;
    if (categoria) DATOS.publicaciones[i].categoria = categoria.value;
    if (resumen) DATOS.publicaciones[i].resumen = resumen.value;
  }
}

// Quita una publicación de la lista.
/* Quita una publicación de la lista. */
function quitarPublicacion(indice) {
  if (!window.confirm("Quitar esta publicación?")) return;
  leerListaPublicaciones();
  DATOS.publicaciones.splice(indice, 1);
  mostrarListaPublicaciones();
}

// Agrega una publicación vacía al final de la lista.
/* Agrega una publicación vacía, para que la firma la escriba. */
function agregarPublicacion() {
  leerListaPublicaciones();
  DATOS.publicaciones.push({
    titulo: "Nueva publicación",
    fecha: "",
    autora: "",
    categoria: "Articulos",
    resumen: "Resumen de la publicación en dos lineas.",
    imagen: "",
    pdf: ""
  });
  mostrarListaPublicaciones();
}

/* =======================================================
   CARRUSEL DE IMÁGENES
   Cada diapositiva vive en DATOS.carrusel:
   { imagen, titulo, texto, tituloEn, textoEn, enlace }
   ======================================================= */

function mostrarListaCarrusel() {
  if (!DATOS.carrusel) {
    DATOS.carrusel = [];
  }
  var html = "";
  for (var i = 0; i < DATOS.carrusel.length; i++) {
    var d = DATOS.carrusel[i];
    var vista = d.imagen
      ? '<img src="' + d.imagen + '" alt="Imagen ' + (i + 1) + '" class="miniatura">'
      : '<span class="pista">Sin imagen todavía</span>';
    var nombreImagen = d.imagen ? "Imagen cargada" : "Ninguna imagen seleccionada";
    html += `
      <div style="border:1px solid #d6dde6;border-radius:10px;padding:14px;margin-bottom:12px">
        <p><strong>Imagen ${i + 1}</strong></p>
        <div class="campo">
          <label>Imagen (JPG o PNG, menos de 900 KB)</label>
          <input type="file" id="carImagen${i}" accept="image/*" class="entrada-archivo">
          <label class="boton-archivo" for="carImagen${i}">Cambiar imagen</label>
          <span class="nombre-archivo" id="carImagenNombre${i}">${nombreImagen}</span>
          <div id="carImagenVista${i}" class="vista-imagen">${vista}</div>
        </div>
        <div class="campo"><label>Título (español, opcional)</label>
          <input type="text" id="carTitulo${i}" value="${escapar(d.titulo || "")}"></div>
        <div class="campo"><label>Subtítulo (español, opcional)</label>
          <textarea id="carTexto${i}" rows="2">${escapar(d.texto || "")}</textarea></div>
        <div class="campo"><label>Título (inglés)</label>
          <input type="text" id="carTituloEn${i}" value="${escapar(d.tituloEn || "")}"></div>
        <div class="campo"><label>Subtítulo (inglés)</label>
          <textarea id="carTextoEn${i}" rows="2">${escapar(d.textoEn || "")}</textarea></div>
        <div class="campo"><label>Enlace (opcional, por ejemplo contacto.html)</label>
          <input type="text" id="carEnlace${i}" value="${escapar(d.enlace || "")}"></div>
        <div class="barra">
          <button class="secundario" type="button" onclick="moverDiapositiva(${i}, -1)">Subir</button>
          <button class="secundario" type="button" onclick="moverDiapositiva(${i}, 1)">Bajar</button>
          <button class="peligro" type="button" onclick="quitarDiapositiva(${i})">Quitar imagen</button>
        </div>
      </div>`;
  }
  $("listaCarrusel").innerHTML = html;

  // Al elegir una imagen se muestra de una vez y se anota el nombre.
  for (var k = 0; k < DATOS.carrusel.length; k++) {
    (function (indice) {
      var campoImagen = $("carImagen" + indice);
      if (campoImagen) {
        campoImagen.addEventListener("change", function () {
          var archivo = this.files && this.files[0];
          if (!archivo) return;
          if (archivo.size > 900000) {
            mostrarAviso("Esa imagen es muy pesada. Use una imagen de menos de 900 KB.", "error");
            this.value = "";
            return;
          }
          if ($("carImagenNombre" + indice)) {
            $("carImagenNombre" + indice).textContent = archivo.name;
          }
          var lector = new FileReader();
          lector.onload = function (evento) {
            DATOS.carrusel[indice].imagen = evento.target.result;
            $("carImagenVista" + indice).innerHTML =
              '<img src="' + evento.target.result + '" alt="Imagen" class="miniatura">';
            // El navegador tiene un limite de espacio; se avisa si se acerca.
            if (JSON.stringify(DATOS).length > 4000000) {
              mostrarAviso("Hay demasiadas imágenes guardadas en este navegador. Use imágenes más pequeñas o quite alguna.", "error");
            }
          };
          lector.readAsDataURL(archivo);
        });
      }

      // Al salir del campo en español, el título y el subtítulo en
      // inglés se traducen solos (si el usuario no los escribio a mano).
      var campoTitulo = $("carTitulo" + indice);
      var campoTexto = $("carTexto" + indice);
      if (campoTitulo) {
        campoTitulo.addEventListener("blur", function () {
          traducirCampoDiapositiva(indice, "titulo");
        });
      }
      if (campoTexto) {
        campoTexto.addEventListener("blur", function () {
          traducirCampoDiapositiva(indice, "texto");
        });
      }

      // Si el usuario escribe el texto en inglés a mano, ya no se
      // vuelve a traducir ese campo.
      var campoTituloEn = $("carTituloEn" + indice);
      var campoTextoEn = $("carTextoEn" + indice);
      if (campoTituloEn) {
        campoTituloEn.addEventListener("input", function () {
          if (DATOS.carrusel[indice]) DATOS.carrusel[indice].autoTituloEn = false;
        });
      }
      if (campoTextoEn) {
        campoTextoEn.addEventListener("input", function () {
          if (DATOS.carrusel[indice]) DATOS.carrusel[indice].autoTextoEn = false;
        });
      }
    })(k);
  }
}

// Lee lo escrito en cada diapositiva y lo pasa a DATOS.
function leerListaCarrusel() {
  if (!Array.isArray(DATOS.carrusel)) DATOS.carrusel = [];
  for (var i = 0; i < DATOS.carrusel.length; i++) {
    if ($("carTitulo" + i)) {
      DATOS.carrusel[i].titulo = $("carTitulo" + i).value;
      DATOS.carrusel[i].texto = $("carTexto" + i).value;
      DATOS.carrusel[i].tituloEn = $("carTituloEn" + i).value;
      DATOS.carrusel[i].textoEn = $("carTextoEn" + i).value;
      DATOS.carrusel[i].enlace = $("carEnlace" + i).value.trim();
    }
  }
}

function agregarDiapositiva() {
  leerListaCarrusel();
  if (!DATOS.carrusel) DATOS.carrusel = [];
  DATOS.carrusel.push({
    imagen: "",
    titulo: "Nueva diapositiva",
    texto: "Texto de la diapositiva.",
    tituloEn: "",
    textoEn: "",
    enlace: "",
    autoTituloEn: true,
    autoTextoEn: true
  });
  mostrarListaCarrusel();

  // Los textos en inglés se traducen solos (si hay internet).
  var ultimo = DATOS.carrusel.length - 1;
  traducirCampoDiapositiva(ultimo, "titulo");
  traducirCampoDiapositiva(ultimo, "texto");
}

function quitarDiapositiva(indice) {
  if (!window.confirm("¿Quitar esta diapositiva?")) return;
  leerListaCarrusel();
  DATOS.carrusel.splice(indice, 1);
  mostrarListaCarrusel();
}

function moverDiapositiva(indice, direccion) {
  leerListaCarrusel();
  var nuevo = indice + direccion;
  if (nuevo < 0 || nuevo >= DATOS.carrusel.length) return;
  var tmp = DATOS.carrusel[indice];
  DATOS.carrusel[indice] = DATOS.carrusel[nuevo];
  DATOS.carrusel[nuevo] = tmp;
  mostrarListaCarrusel();
}

/* Guarda en este navegador y descarga datos.json para subirlo al sitio. */
function descargarDatos() {
  leerListaServicios();
  leerListaEquipo();
  guardar();
  var blob = new Blob([JSON.stringify(DATOS, null, 2)], { type: "application/json" });
  var enlace = document.createElement("a");
  enlace.href = URL.createObjectURL(blob);
  enlace.download = "datos.json";
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  mostrarAviso("Se descargó datos.json. Súbalo a la carpeta del sitio, reemplazando el anterior, para que lo vean todos los visitantes.", "ok");
}

/* Dibuja la lista del equipo: cada persona con su nombre, su cargo,
   sus iniciales y su sinopsis. */
function mostrarListaEquipo() {
  var html = "";
  for (var i = 0; i < DATOS.equipo.length; i++) {
    var persona = DATOS.equipo[i];

    html += `
      <div class="item">
        <div class="tres">
          <div class="campo">
            <label>Nombre</label>
            <input type="text" id="eqNombre${i}" value="${escapar(persona.nombre)}">
          </div>
          <div class="campo">
            <label>Cargo</label>
            <input type="text" id="eqCargo${i}" value="${escapar(persona.cargo)}">
          </div>
          <div class="campo">
            <label>Iniciales</label>
            <input type="text" id="eqIniciales${i}" maxlength="3" value="${escapar(persona.iniciales)}">
          </div>
        </div>
        <div class="campo">
          <label>Sinopsis</label>
          <textarea id="eqSynopsis${i}" placeholder="Un texto corto que resuma su experiencia">${escapar(persona.sinopsis)}</textarea>
        </div>
        <button class="peligro" onclick="quitarIntegrante(${i})">Quitar a esta persona</button>
      </div>`;
  }
  $("listaEquipo").innerHTML = html;
}

/* Lee lo que se escribio de cada integrante y lo guarda en DATOS. */
function leerListaEquipo() {
  for (var i = 0; i < DATOS.equipo.length; i++) {
    // Si el campo no esta en pantalla, se conserva lo ya guardado.
    var nombre = $("eqNombre" + i);
    var cargo = $("eqCargo" + i);
    var iniciales = $("eqIniciales" + i);
    var sinopsis = $("eqSynopsis" + i);
    if (nombre) DATOS.equipo[i].nombre = nombre.value;
    if (cargo) DATOS.equipo[i].cargo = cargo.value;
    if (iniciales) DATOS.equipo[i].iniciales = iniciales.value;
    DATOS.equipo[i].sinopsis = sinopsis ? sinopsis.value.trim() : (DATOS.equipo[i].sinopsis || "");
  }
}

/* Quita una persona del equipo. */
function quitarIntegrante(indice) {
  if (!window.confirm("Quitar a esta persona del equipo?")) return;
  leerListaEquipo();
  DATOS.equipo.splice(indice, 1);
  mostrarListaEquipo();
}

/* Agrega una persona vacía al equipo. */
function agregarIntegrante() {
  leerListaEquipo();
  DATOS.equipo.push({
    nombre: "Nuevo integrante",
    cargo: "Cargo",
    iniciales: "NI",
    sinopsis: "Escriba aquí una sinopsis corta de su experiencia."
  });
  mostrarListaEquipo();
}

// Escapa las comillas para que un texto no rompa el HTML
/* Escapa los caracteres especiales de un texto (&, <, >, ").
   Sirve para que lo que escriba el administrador no rompa el HTML. */
function escapar(texto) {
  return String(texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* =======================================================
   6. LOGO Y COLOR
   ======================================================= */

/* Muestra el logotipo que se ha cargado. */
function mostrarLogo() {
  if (!DATOS.empresa.logo) {
    $("vistaLogo").innerHTML = '<p class="pista">Todavía no hay un logotipo cargado.</p>';
    if ($("logoNombre")) $("logoNombre").textContent = "Ningún logotipo seleccionado";
    return;
  }
  $("vistaLogo").innerHTML = '<img class="logo-mini" src="' + DATOS.empresa.logo + '" alt="Logotipo actual">';
  if ($("logoNombre")) $("logoNombre").textContent = "Logotipo cargado";
}

/* Cuando se elige una imagen, se lee y se muestra como logotipo.
   El FileReader es lo que lee el archivo que eligio la persona. */
function cambiarLogo(evento) {
  var archivo = evento.target.files[0];
  if (!archivo) return;

  if ($("logoNombre")) $("logoNombre").textContent = archivo.name;

  var lector = new FileReader();
  lector.onload = function (e) {
    DATOS.empresa.logo = e.target.result;
    mostrarLogo();
    guardar();
    mostrarAviso("Logotipo actualizado. Pulse Guardar cambios para que se aplique.", "ok");
  };
  lector.readAsDataURL(archivo);
}

/* =======================================================
   6b. SOLICITUDES RECIBIDAS
   ======================================================= */

// El nombre con el que se guardan las solicitudes que llegan.
var CLAVE_SOLICITUDES = "solicitudesMontes";

/* Devuelve las solicitudes que han llegado desde el formulario. */
function leerSolicitudes() {
  try {
    var guardadas = localStorage.getItem(CLAVE_SOLICITUDES);
    if (guardadas) {
      return JSON.parse(guardadas);
    }
  } catch (error) {
    console.log("No se pudieron leer las solicitudes:", error.message);
  }
  return [];
}

/* Las solicitudes que bajaron de la base de datos (solo con Supabase). */
var SOLICITUDES_SERVIDOR = [];

/* Con Supabase: baja las solicitudes y las dibuja, cada una con un
   desplegable para cambiar su estado. */
function mostrarSolicitudesServidor() {
  var lista = $("listaSolicitudes");
  lista.innerHTML = '<p class="pista">Cargando solicitudes…</p>';

  listarSolicitudes().then(function (r) {
    if (!r.ok) {
      lista.innerHTML = '<p class="pista">No se pudieron cargar las solicitudes. Revise la conexión e intente de nuevo.</p>';
      return;
    }
    SOLICITUDES_SERVIDOR = r.solicitudes;
    if (r.solicitudes.length === 0) {
      lista.innerHTML = '<p class="pista">Todavía no hay solicitudes registradas.</p>';
      return;
    }

    var html = "";
    for (var i = 0; i < r.solicitudes.length; i++) {
      var s = r.solicitudes[i];
      var fecha = new Date(s.creado_en).toLocaleString("es-CO");
      var opciones = "";
      for (var e = 0; e < ESTADOS.length; e++) {
        opciones += '<option value="' + ESTADOS[e] + '"' + (ESTADOS[e] === s.estado ? " selected" : "") + ">" +
          ETIQUETA_ESTADO.es[ESTADOS[e]] + "</option>";
      }
      html += `
      <div class="item">
        <h3>${escapar(s.area_nombre || "Sin área")} - ${escapar(fecha)}</h3>
        <p style="font-size:13px; color:#566573; margin-bottom:6px">
          <strong>Código:</strong> ${escapar(s.codigo)} &nbsp;·&nbsp;
          <strong>Correo:</strong> ${escapar(s.correo)} &nbsp;·&nbsp;
          <strong>Tel:</strong> ${escapar(s.telefono || "")} &nbsp;·&nbsp;
          <strong>Nombre:</strong> ${escapar(s.nombre_completo || "")}
        </p>
        <p style="font-size:14px">${escapar(s.mensaje)}</p>
        <span class="pista">Estado:
          <select data-solicitud="${escapar(s.id)}">${opciones}</select>
          &nbsp;·&nbsp; Origen: ${escapar(s.tipo || "contacto")}</span>
        <div class="barra" style="margin-top:10px">
          <button class="peligro" type="button" data-borrar="${escapar(s.id)}">Borrar solicitud</button>
        </div>
      </div>`;
    }
    lista.innerHTML = html;
  });
}

/* Dibuja la lista de solicitudes con los datos de cada una. */
function mostrarSolicitudes() {
  if (hayBackend()) {
    mostrarSolicitudesServidor();
    return;
  }
  var solicitudes = leerSolicitudes();
  var lista = $("listaSolicitudes");

  if (solicitudes.length === 0) {
    lista.innerHTML = '<p class="pista">Todavía no hay solicitudes registradas.</p>';
    return;
  }

  var html = "";
  for (var i = solicitudes.length - 1; i >= 0; i--) {
    var s = solicitudes[i];
    html += `
      <div class="item">
        <h3>${escapar(s.area || "Sin área")} ${s.fecha ? "- " + escapar(s.fecha) : ""}</h3>
        <p style="font-size:13px; color:#566573; margin-bottom:6px">
          <strong>Correo:</strong> ${escapar(s.correo)} &nbsp;·&nbsp;
          <strong>Tel:</strong> ${escapar(s.telefono)} ${s.nombre ? "· <strong>Nombre:</strong> " + escapar(s.nombre) : ""}
        </p>
        <p style="font-size:14px">${escapar(s.mensaje)}</p>
        <span class="pista">Estado: ${escapar(s.estado || "Enviada")} &nbsp;·&nbsp; Origen: ${escapar(s.tipo || "mi cuenta")}</span>
      </div>`;
  }
  lista.innerHTML = html;
}

/* Baja las solicitudes en un archivo de texto separado por punto y
   coma, que se puede abrir con Excel. */
function exportarSolicitudes() {
  var solicitudes = hayBackend()
    ? SOLICITUDES_SERVIDOR.map(function (s) {
        return {
          fecha: new Date(s.creado_en).toLocaleString("es-CO"),
          area: s.area_nombre,
          correo: s.correo,
          telefono: s.telefono,
          nombre: s.nombre_completo,
          mensaje: s.mensaje,
          estado: ETIQUETA_ESTADO.es[s.estado] || s.estado,
        };
      })
    : leerSolicitudes();
  if (solicitudes.length === 0) {
    mostrarAviso("No hay solicitudes para descargar.", "error");
    return;
  }

  // Se arma una tabla que se puede abrir con Excel.
  var filas = [["Fecha", "Área", "Correo", "Teléfono", "Nombre", "Mensaje", "Estado"]];
  for (var i = 0; i < solicitudes.length; i++) {
    var s = solicitudes[i];
    filas.push([
      s.fecha || "", s.area || "", s.correo || "", s.telefono || "",
      s.nombre || "", s.mensaje || "", s.estado || ""
    ]);
  }

  var contenido = "";
  for (var j = 0; j < filas.length; j++) {
    var celdas = filas[j].map(function (celda) {
      return '"' + String(celda).replace(/"/g, '""') + '"';
    });
    contenido += celdas.join(";") + "\n";
  }

  var blob = new Blob(["\ufeff" + contenido], { type: "text/csv;charset=utf-8" });
  var enlace = document.createElement("a");
  enlace.href = URL.createObjectURL(blob);
  enlace.download = "solicitudes.csv";
  enlace.click();
  URL.revokeObjectURL(enlace.href);
  mostrarAviso("Se descargaron " + solicitudes.length + " solicitudes. Puede abrir el archivo con Excel.", "ok");
}

/* Borra todas las solicitudes guardadas en este navegador. */
function borrarSolicitudes() {
  if (!window.confirm("Se borraran todas las solicitudes guardadas en este navegador. Continuar?")) {
    return;
  }
  try {
    localStorage.removeItem(CLAVE_SOLICITUDES);
  } catch (error) {
    console.log("No se pudieron borrar:", error.message);
  }
  mostrarSolicitudes();
  mostrarAviso("Solicitudes borradas.", "ok");
}

/* =======================================================
   7b. CAMBIAR Y RESTABLECER LA CONTRASEÑA
   ======================================================= */

// Guarda la contraseña nueva del panel.
/* Cambia la clave con la que se entra al panel.
   Pide la clave actual (para confirmar que quien la cambia es el
   administrador) y la nueva. */
function cambiarClaveAdmin() {
  var aviso = $("avisoClave");
  var actual = $("claveActual").value;
  var nueva = $("claveNueva").value;
  var repetir = $("claveNueva2").value;

  /* Con Supabase: se confirma la clave actual y se cambia en la cuenta real. */
  if (hayBackend()) {
    if (nueva.length < 8) {
      aviso.textContent = "La contraseña nueva debe tener al menos 8 caracteres.";
      return;
    }
    if (nueva !== repetir) {
      aviso.textContent = "Las dos contraseñas nuevas no son iguales.";
      return;
    }
    aviso.textContent = "Guardando…";
    cambiarClave(actual, nueva).then(function (r) {
      if (r.ok) {
        aviso.textContent = "Contraseña cambiada. Use la nueva la próxima vez que entre.";
        $("claveActual").value = "";
        $("claveNueva").value = "";
        $("claveNueva2").value = "";
      } else if (r.codigo === "invalid_credentials") {
        aviso.textContent = "La contraseña actual no es correcta.";
      } else {
        aviso.textContent = "No se pudo cambiar la contraseña. Intente de nuevo.";
      }
    });
    return;
  }

  if (actual !== leerClaveAdmin()) {
    aviso.textContent = "La contraseña actual no es correcta.";
    return;
  }
  if (nueva.length < 6) {
    aviso.textContent = "La contraseña nueva debe tener al menos 6 caracteres.";
    return;
  }
  if (nueva !== repetir) {
    aviso.textContent = "Las dos contraseñas nuevas no son iguales.";
    return;
  }

  try {
    localStorage.setItem(CLAVE_ADMIN, nueva);
    aviso.textContent = "Contraseña cambiada. Use la nueva la próxima vez que entre.";
    $("claveActual").value = "";
    $("claveNueva").value = "";
    $("claveNueva2").value = "";
  } catch (error) {
    aviso.textContent = "No se pudo guardar la contraseña: " + error.message;
  }
}

// Vuelve a la contraseña inicial, por si se olvidó la nueva.
/* Vuelve a poner la clave de fabrica, por si se olvidó la del panel. */
function restablecerClaveAdmin() {
  /* Con Supabase: se envía un enlace al correo de la cuenta. */
  if (hayBackend()) {
    perfilActual().then(function (perfil) {
      if (!perfil) {
        $("avisoClave").textContent = "Vuelva a entrar al panel e intente de nuevo.";
        return;
      }
      pedirRecuperacion(perfil.correo).then(function (r) {
        $("avisoClave").textContent = r.ok
          ? "Le enviamos un enlace a " + perfil.correo + " para poner una contraseña nueva."
          : "No se pudo enviar el enlace. Intente de nuevo en unos minutos.";
      });
    });
    return;
  }
  if (!window.confirm("Se volverá a la contraseña inicial. ¿Continuar?")) {
    return;
  }
  try {
    localStorage.removeItem(CLAVE_ADMIN);
    $("avisoClave").textContent = "Contraseña restablecida. Ya puede entrar con la contraseña inicial.";
    $("claveActual").value = "";
    $("claveNueva").value = "";
    $("claveNueva2").value = "";
  } catch (error) {
    $("avisoClave").textContent = "No se pudo restablecer: " + error.message;
  }
}

/* =======================================================
   7c. MOSTRAR U OCULTAR LA CONTRASEÑA
   -------------------------------------------------------
   El botón con el ojo cambia el campo entre "oculto" y
   "visible", para que la persona este segura de que
   escribio bien su contraseña.
   ======================================================= */

/* Muestra o esconde la contraseña de un campo. */
function verClave(campo, boton) {
  var input = document.getElementById(campo);

  if (input.type === "password") {
    input.type = "text";
    boton.classList.add("viendo");
  } else {
    input.type = "password";
    boton.classList.remove("viendo");
  }
}

/* =======================================================
   8. INICIO DE SESIÓN
   ======================================================= */

/* Entra al panel: revisa el usuario y la clave, y si están bien
   muestra el panel y carga los datos. */
function abrirPanel() {
  $("login").classList.add("oculto");
  $("panel").classList.remove("oculto");
  cargar();
}

function entrar() {
  var usuario = $("usuario").value.trim();
  var clave = $("clave").value;
  var aviso = $("loginAviso");

  /* Con Supabase: correo y contraseña reales; solo pasan admin y editor. */
  if (hayBackend()) {
    if (usuario === "" || clave === "") {
      aviso.textContent = "Escriba su correo y su contraseña.";
      aviso.className = "aviso error";
      return;
    }
    aviso.textContent = "Entrando…";
    aviso.className = "aviso";
    entrarPersonal(usuario.toLowerCase(), clave).then(function (r) {
      if (!r.ok) {
        var texto = "No se pudo conectar con el servidor. Intente de nuevo.";
        if (r.codigo === "invalid_credentials") texto = "Ese correo o esa contraseña no son correctos.";
        if (r.codigo === "sin_permiso") texto = "Esta cuenta no tiene acceso al panel de administración.";
        if (r.codigo === "email_not_confirmed") texto = "Falta confirmar el correo de esta cuenta.";
        aviso.textContent = texto;
        aviso.className = "aviso error";
        return;
      }
      aviso.textContent = "";
      $("clave").value = "";
      abrirPanel();
    });
    return;
  }

  if (usuario !== USUARIO || clave !== leerClaveAdmin()) {
    aviso.textContent = "Ese usuario o esa contraseña no son correctos.";
    aviso.className = "aviso error";
    return;
  }

  abrirPanel();
}

/* ---------- Botones y formularios ---------- */
export function iniciarAdmin() {
  /* Con Supabase: si ya había una sesión de personal abierta, se entra directo. */
  if (hayBackend()) {
    perfilActual().then(function (perfil) {
      if (esPersonal(perfil)) abrirPanel();
    });
    /* Las solicitudes no se borran desde aquí: se marcan Cerrada o Spam. */
    $("btnBorrarSolicitudes").style.display = "none";
    /* Borrado individual con doble confirmación. */
    $("listaSolicitudes").addEventListener("click", function (evento) {
      var boton = evento.target.closest ? evento.target.closest("[data-borrar]") : null;
      if (!boton) return;
      var id = Number(boton.getAttribute("data-borrar"));
      if (!window.confirm("¿Borrar esta solicitud? Esta acción no se puede deshacer.")) return;
      if (!window.confirm("Segunda confirmación: la solicitud se eliminará de la base de datos de forma permanente. ¿Continuar?")) return;
      boton.disabled = true;
      borrarSolicitud(id).then(function (r) {
        if (r.ok) {
          mostrarAviso("Solicitud borrada.", "ok");
          mostrarSolicitudesServidor();
        } else {
          boton.disabled = false;
          mostrarAviso("No se pudo borrar la solicitud.", "error");
        }
      });
    });
    $("listaSolicitudes").addEventListener("change", function (evento) {
      var lista = evento.target;
      if (!lista || !lista.getAttribute || !lista.getAttribute("data-solicitud")) return;
      cambiarEstadoSolicitud(Number(lista.getAttribute("data-solicitud")), lista.value).then(function (r) {
        mostrarAviso(r.ok ? "Estado actualizado." : "No se pudo cambiar el estado.", r.ok ? "ok" : "error");
      });
    });
  }

  $("btnEntrar").addEventListener("click", entrar);
  $("clave").addEventListener("keydown", function (e) {
    if (e.key === "Enter") entrar();
  });

  $("btnGuardar").addEventListener("click", function () {
    leerListaServicios();
    leerListaEquipo();
    guardar();
  });
  $("btnRestablecer").addEventListener("click", restablecer);
  $("btnAgregarServicio").addEventListener("click", agregarServicio);
  $("btnAgregarIntegrante").addEventListener("click", agregarIntegrante);
  $("btnAgregarPublicacion").addEventListener("click", agregarPublicacion);
  $("btnAgregarDiapositiva").addEventListener("click", agregarDiapositiva);
  $("btnDescargarDatos").addEventListener("click", descargarDatos);
  $("logo").addEventListener("change", cambiarLogo);

  $("colorMarca").addEventListener("input", function () {
    $("colorMarcaTexto").value = this.value;
  });
  $("colorMarcaTexto").addEventListener("input", function () {
    if (/^#[0-9a-fA-F]{6}$/.test(this.value)) {
      $("colorMarca").value = this.value;
    }
  });

  $("btnExportarSolicitudes").addEventListener("click", exportarSolicitudes);
  $("formularioClave").addEventListener("submit", function (evento) {
    evento.preventDefault();
    cambiarClaveAdmin();
  });
  $("btnRestablecerClave").addEventListener("click", restablecerClaveAdmin);
  $("btnBorrarSolicitudes").addEventListener("click", borrarSolicitudes);

  $("btnSalir").addEventListener("click", function () {
    if (hayBackend()) salir();
    $("panel").classList.add("oculto");
    $("login").classList.remove("oculto");
    $("clave").value = "";
    $("loginAviso").textContent = "";
    $("loginAviso").className = "aviso";
    $("usuario").focus();
  });
}

Object.assign(window, { moverDiapositiva, quitarDiapositiva, quitarIntegrante, quitarPublicacion, quitarServicio, verClave });
