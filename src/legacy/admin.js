/* Panel de administración (migrado). React monta el marcado y llama a iniciarAdmin(). */


/* =======================================================
   1. CONFIGURACION
   ======================================================= */

// Contrasena inicial de acceso al panel.
// Si el administrador la cambia, queda guardada en este computador.
// La clave con la que se entra al panel. Es la de fabrica: conviene
// cambiarla desde la seccion 7 (Seguridad) antes de publicar el sitio.
var CLAVE = "montes2026";
// El nombre de usuario del administrador.
var USUARIO = "admin";

// Clave donde se guarda la contraseña nueva del panel
// La clave se guarda con este nombre en el navegador (asi no se
// puede leer con la simple vista del codigo).
var CLAVE_ADMIN = "claveAdminMontes";

// Devuelve la contraseña con la que se entra: la que se haya cambiado
// o, si nunca se cambio, la inicial.
/* Lee la clave con la que se entra al panel.
   Si el administrador ya la cambio, se usa esa; si no, se usa la de
   fabrica que esta mas arriba. */
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
   poder completar lo que le falte a los datos que ya estan guardados
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
    telefono: "+57 300 72 57 266",
    telefonoAlterno: "+57 601 467 2868",
    correo: "claudia@montes-a.com",
    correoGeneral: "claudia@montes-a.com",
    correoOficialDatos: "claudia@montes-a.com",
    correoAlterno: "contacto@mwabogados.com",
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
    { titulo: "Derecho Comercial y Contratos", texto: "Asesoramos a empresas en sus operaciones comerciales y en la negociacion, redaccion y revision de contratos, para prevenir riesgos y proteger sus intereses." },
    { titulo: "Derecho Laboral y Seguridad Social", texto: "Acompanamos a nuestros clientes en contratacion, cumplimiento de obligaciones laborales y de seguridad social, terminaciones y reclamaciones." },
    { titulo: "Derecho Administrativo", texto: "Acompanamos a empresas en sus tramites y actuaciones ante entidades publicas, en la presentacion de recursos y en los procesos ante la jurisdiccion de lo contencioso administrativo." },
    { titulo: "Derecho Migratorio", texto: "Asesoramos a empresas y a sus colaboradores extranjeros en la obtencion de visas y permisos, y en el cumplimiento de sus obligaciones ante Migracion Colombia y la Cancilleria." },
    { titulo: "Litigio Civil y Comercial", texto: "Representamos a nuestros clientes en procesos judiciales y en mecanismos alternativos de solucion de conflictos, con una estrategia clara desde el inicio." },
    { titulo: "Recaudo de Cartera", texto: "Gestionamos el cobro prejuridico y juridico de obligaciones para ayudar a las empresas a recuperar su cartera de forma eficiente y conforme a la ley." },
    { titulo: "Insolvencia Empresarial", texto: "Representamos a acreedores, personas naturales y juridicas, en procesos de reorganizacion, liquidacion y demas tramites de insolvencia, para proteger y hacer valer sus creditos." }
  ],
  // Las publicaciones de la seccion "Actualidad Juridica".
  // Cada una puede llevar una imagen y un archivo en PDF adjunto.
  publicaciones: [
    {
      titulo: "Proteccion constitucional del fuero de salud",
      fecha: "21 de febrero de 2024",
      autora: "Claudia Montes Castro",
      categoria: "Articulos",
      resumen: "Que protege el fuero de salud en Colombia, como se invoca y que pasos deben seguir el trabajador y la empresa cuando se presenta una situacion de esta naturaleza.",
      imagen: "",
      pdf: ""
    },
    {
      titulo: "Como preparar una reorganizacion societaria",
      fecha: "12 de mayo de 2024",
      autora: "Lucy Montes Castro",
      categoria: "Articulos",
      resumen: "Los pasos que conviene revisar antes de una escision, una fusion o una conversion de la compania, y los documentos que hay que tener listos.",
      imagen: "",
      pdf: ""
    },
    {
      titulo: "La Ley 2300 de 2023 y las nuevas reglas de contacto en el recaudo de cartera",
      fecha: "3 de septiembre de 2024",
      autora: "Lucy Montes Castro",
      categoria: "Novedades normativas",
      resumen: "Los canales, horarios y la frecuencia que permite la nueva norma en las gestiones de cobranza, y como afecta el manejo de la informacion del deudor.",
      imagen: "",
      pdf: ""
    }
  ],
  equipo: [
    {
      nombre: "Claudia Marcela Montes Castro", cargo: "Cofundadora y Directora General", iniciales: "CM",
      sinopsis: "Abogada de la Universidad del Rosario y especialista en Derecho Laboral y de la Seguridad Social, con mas de doce anos de ejercicio profesional. Antes de asumir la direccion de MAA trabajo en la Rama Judicial, donde vio de primera mano como se estudian y se deciden los casos: esa experiencia marca su forma de ejercer y la prepara pensando en como lo va a leer el juez. Cofundo MAA en 2010 junto a Lucy Montes y desde 2018 dirige la firma, donde lidera la asesoria juridica y la defensa judicial. Se caracteriza por su trato directo, por explicar con claridad los riesgos y las opciones de cada caso y por acompanar a sus clientes de principio a fin, con amplia experiencia en empresas multinacionales y en negocios internacionales."
    },
    {
      nombre: "Lucy Montes Castro", cargo: "Cofundadora", iniciales: "LM",
      sinopsis: "Abogada de la Universidad Libre, especialista en Derecho Administrativo de la misma universidad y en Derecho Tributario de la Universidad del Rosario. Cofundo MAA en 2010 junto a Claudia Montes. Su formacion en derecho administrativo y tributario complementa la practica de la firma y aporta una vision clave para las empresas en su relacion con el Estado y con las autoridades tributarias. Se caracteriza por su capacidad para anticipar los efectos de una decision publica sobre la operacion de una empresa y por su compromiso con un trabajo riguroso, ordenado y cercano al cliente."
    },
    {
      nombre: "Jorge Montes Castro", cargo: "Asociado Senior", iniciales: "JM",
      sinopsis: "Abogado especializado en derecho comercial, con experiencia en la gestion de cartera y en cobranza prejuridica y judicial, en negociacion de relacionamientos comerciales y en la revision y negociacion de contratos. Se caracteriza por su conocimiento practico del cobro, por su capacidad para disenar rutas de recuperacion que respetan la ley y por su compromiso con el cumplimiento de los terminos procesales y con el resultado de la firma."
    },
    {
      nombre: "Daniel Bertel Paternina", cargo: "Auxiliar Juridico", iniciales: "DB",
      sinopsis: "Profesional en formacion en Derecho, actualmente cursando IV semestre, con experiencia en apoyo juridico, revision de expedientes, seguimiento de procesos judiciales y elaboracion de documentos juridicos. Se caracteriza por su organizacion, responsabilidad y capacidad de analisis juridico, asi como por su compromiso con el cumplimiento de los terminos procesales y el desarrollo eficiente de las actividades propias del ambito legal."
    },
    {
      nombre: "Laura Catalina Urrego Sastre", cargo: "Abogada", iniciales: "LU",
      sinopsis: "Abogada de la Universidad Militar Nueva Granada, actualmente cursa la Especializacion en Derecho Empresarial y de los Negocios en la Universidad del Rosario. Su practica se centra en el derecho civil, comercial, laboral y en la contratacion estatal. Tiene experiencia en asesoria juridica corporativa, elaboracion y revision de contratos, emision de conceptos juridicos, litigios y recuperacion de cartera en todas sus etapas. Ha acompanado a empresas del sector de la construccion e infraestructura en la estructuracion y ejecucion de proyectos, manejo de polizas y garantias, procesos de contratacion publica y atencion de requerimientos de organos de control. Ha apoyado tambien asuntos laborales y reclamaciones ante aseguradoras. Se destaca por su asesoria juridica integral y por su compromiso con la calidad en cada asunto."
    }
  ]
};

/* =======================================================
   3. UTILIDADES
   ======================================================= */

// La copia de trabajo: es la que se edita y la que se guarda.
var DATOS = clonarObjeto(DATOS_POR_DEFECTO);

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
   Ademas baja un archivo con toda la informacion, que es el que hay
   que subir al alojamiento para que los cambios se vean en internet. */
function guardar() {
  // Se leen los campos simples del formulario
  DATOS.empresa.nombre = $("nombre").value;
  DATOS.empresa.grupo = $("grupo").value;
  DATOS.empresa.colorMarca = $("colorMarca").value;

  DATOS.contacto.telefono = $("telefono").value;
  DATOS.contacto.telefonoAlterno = $("telefonoAlterno").value;
  DATOS.contacto.correo = $("correo").value;
  DATOS.contacto.correoAlterno = $("correoAlterno").value;
  DATOS.contacto.direccion = $("direccion").value;
  DATOS.contacto.direccionEspana = $("direccionEspana").value;
  DATOS.contacto.sitioWeb = $("sitioWeb").value;
  DATOS.contacto.sitioWebEspana = $("sitioWebEspana").value;
  DATOS.contacto.horario = $("horario").value;
  DATOS.contacto.horarioSabado = $("horarioSabado").value;
  DATOS.contacto.whatsappNumero = $("whatsappNumero").value;

  // Las publicaciones tambien se guardan.
  if ($("listaPublicaciones")) {
    leerListaPublicaciones();
  }

  // El carrusel tambien se guarda.
  leerListaCarrusel();

  try {
    localStorage.setItem(LLAVE, JSON.stringify(DATOS));
    mostrarAviso("Cambios guardados. Ya puede ver el sitio con la informacion nueva.", "ok");
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

  if (guardado) {
    try {
      DATOS = JSON.parse(guardado);
    } catch (error) {
      console.log("Los datos guardados no se pudieron leer:", error.message);
      DATOS = clonarObjeto(DATOS_POR_DEFECTO);
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
    // las publicaciones, que se agregaron despues de la primera version).
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
  $("telefonoAlterno").value = DATOS.contacto.telefonoAlterno;
  $("correo").value = DATOS.contacto.correo;
  $("correoAlterno").value = DATOS.contacto.correoAlterno;
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
}

/* Vuelve a poner los datos de fabrica: deshace todos los cambios. */
function restablecer() {
  if (!window.confirm("Se van a borrar los cambios guardados en este computador y la pagina volvera a su estado original. Continuar?")) {
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
   5. SERVICIOS Y EQUIPO (listas editables)
   ======================================================= */

/* Dibuja la lista de areas de práctica, cada una con su titulo,
   su descripcion y un boton para quitarla. */
function mostrarListaServicios() {
  var html = "";
  for (var i = 0; i < DATOS.servicios.length; i++) {
    html += `
      <div class="item">
        <div class="fila">
          <div class="campo">
            <label>Titulo</label>
            <input type="text" id="servTitulo${i}" value="${escapar(DATOS.servicios[i].titulo)}">
          </div>
          <div class="campo">
            <label>Acciones</label>
            <button class="peligro" onclick="quitarServicio(${i})">Quitar esta area</button>
          </div>
        </div>
        <div class="campo">
          <label>Descripcion</label>
          <textarea id="servTexto${i}">${escapar(DATOS.servicios[i].texto)}</textarea>
        </div>
      </div>`;
  }
  $("listaServicios").innerHTML = html;
}

/* Lee lo que se escribio en cada area y lo guarda en DATOS. */
function leerListaServicios() {
  for (var i = 0; i < DATOS.servicios.length; i++) {
    DATOS.servicios[i].titulo = $("servTitulo" + i).value;
    DATOS.servicios[i].texto = $("servTexto" + i).value;
  }
}

/* Quita un area de la lista de areas de práctica. */
function quitarServicio(indice) {
  if (!window.confirm("Quitar esta area de servicio?")) return;
  leerListaServicios();
  DATOS.servicios.splice(indice, 1);
  mostrarListaServicios();
}

/* Agrega un area de práctica vacia, para que la firma la escriba. */
function agregarServicio() {
  leerListaServicios();
  DATOS.servicios.push({ titulo: "Nueva area", texto: "Descripcion del servicio." });
  mostrarListaServicios();
}

// Las cuatro categorias que usa la seccion de actualidad juridica.
// Las cuatro categorias de la seccion de actualidad juridica: son los
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
            <label>Titulo</label>
            <input type="text" id="pubTitulo${i}" value="${escapar(publicacion.titulo)}">
          </div>
          <div class="campo">
            <label>Acciones</label>
            <button class="peligro" onclick="quitarPublicacion(${i})">Quitar esta publicacion</button>
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
            <label>Categoria</label>
            <select id="pubCategoria${i}">${opciones}</select>
          </div>
        </div>
        <div class="campo">
          <label>Resumen (dos lineas)</label>
          <textarea id="pubResumen${i}">${escapar(publicacion.resumen)}</textarea>
        </div>
        <div class="fila">
          <div class="campo">
            <label>Imagen de la publicacion</label>
            <input type="file" id="pubImagen${i}" accept="image/*">
            <div id="pubImagenVista${i}" class="vista-imagen">${vistaImagen}</div>
          </div>
          <div class="campo">
            <label>Archivo en PDF</label>
            <input type="file" id="pubPdf${i}" accept="application/pdf">
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
          var lector = new FileReader();
          lector.onload = function (evento) {
            DATOS.publicaciones[indice].imagen = evento.target.result;
            $("pubImagenVista" + indice).innerHTML =
              `<img src="${evento.target.result}" alt="Imagen de la publicacion" class="miniatura">`;
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
          $("pubPdfVista" + indice).innerHTML =
            `<span class="pista">Archivo adjunto: ${escapar(archivo.name)}</span>`;
        });
      }
    })(k);
  }
}

// Lee los campos de cada publicacion y los guarda en DATOS.
/* Lee lo que se escribio en cada publicacion y lo guarda en DATOS. */
function leerListaPublicaciones() {
  for (var i = 0; i < DATOS.publicaciones.length; i++) {
    DATOS.publicaciones[i].titulo = $("pubTitulo" + i).value;
    DATOS.publicaciones[i].fecha = $("pubFecha" + i).value;
    DATOS.publicaciones[i].autora = $("pubAutora" + i).value;
    DATOS.publicaciones[i].categoria = $("pubCategoria" + i).value;
    DATOS.publicaciones[i].resumen = $("pubResumen" + i).value;
  }
}

// Quita una publicacion de la lista.
/* Quita una publicacion de la lista. */
function quitarPublicacion(indice) {
  if (!window.confirm("Quitar esta publicacion?")) return;
  leerListaPublicaciones();
  DATOS.publicaciones.splice(indice, 1);
  mostrarListaPublicaciones();
}

// Agrega una publicacion vacia al final de la lista.
/* Agrega una publicacion vacia, para que la firma la escriba. */
function agregarPublicacion() {
  leerListaPublicaciones();
  DATOS.publicaciones.push({
    titulo: "Nueva publicacion",
    fecha: "",
    autora: "",
    categoria: "Articulos",
    resumen: "Resumen de la publicacion en dos lineas.",
    imagen: "",
    pdf: ""
  });
  mostrarListaPublicaciones();
}

/* =======================================================
   CARRUSEL DE IMAGENES
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
      : '<span class="pista">Sin imagen todavia</span>';
    html += `
      <div style="border:1px solid #d6dde6;border-radius:10px;padding:14px;margin-bottom:12px">
        <p><strong>Diapositiva ${i + 1}</strong></p>
        <div class="campo">
          <label>Imagen (JPG o PNG, menos de 900 KB)</label>
          <input type="file" id="carImagen${i}" accept="image/*">
          <div id="carImagenVista${i}" class="vista-imagen">${vista}</div>
        </div>
        <div class="campo"><label>Titulo (espanol)</label>
          <input type="text" id="carTitulo${i}" value="${escapar(d.titulo || "")}"></div>
        <div class="campo"><label>Texto (espanol)</label>
          <textarea id="carTexto${i}" rows="2">${escapar(d.texto || "")}</textarea></div>
        <div class="campo"><label>Titulo (ingles)</label>
          <input type="text" id="carTituloEn${i}" value="${escapar(d.tituloEn || "")}"></div>
        <div class="campo"><label>Texto (ingles)</label>
          <textarea id="carTextoEn${i}" rows="2">${escapar(d.textoEn || "")}</textarea></div>
        <div class="campo"><label>Enlace (opcional, por ejemplo contacto.html)</label>
          <input type="text" id="carEnlace${i}" value="${escapar(d.enlace || "")}"></div>
        <div>
          <button class="secundario" type="button" onclick="moverDiapositiva(${i}, -1)">Subir</button>
          <button class="secundario" type="button" onclick="moverDiapositiva(${i}, 1)">Bajar</button>
          <button class="secundario" type="button" onclick="quitarDiapositiva(${i})">Quitar</button>
        </div>
      </div>`;
  }
  $("listaCarrusel").innerHTML = html;

  // Al elegir una imagen se muestra de una vez.
  for (var k = 0; k < DATOS.carrusel.length; k++) {
    (function (indice) {
      var campoImagen = $("carImagen" + indice);
      if (!campoImagen) return;
      campoImagen.addEventListener("change", function () {
        var archivo = this.files && this.files[0];
        if (!archivo) return;
        if (archivo.size > 900000) {
          mostrarAviso("Esa imagen es muy pesada. Use una imagen de menos de 900 KB.", "error");
          this.value = "";
          return;
        }
        var lector = new FileReader();
        lector.onload = function (evento) {
          DATOS.carrusel[indice].imagen = evento.target.result;
          $("carImagenVista" + indice).innerHTML =
            '<img src="' + evento.target.result + '" alt="Imagen" class="miniatura">';
          // El navegador tiene un limite de espacio; se avisa si se acerca.
          if (JSON.stringify(DATOS).length > 4000000) {
            mostrarAviso("Hay demasiadas imagenes guardadas en este navegador. Use imagenes mas pequenas o quite alguna.", "error");
          }
        };
        lector.readAsDataURL(archivo);
      });
    })(k);
  }
}

// Lee lo escrito en cada diapositiva y lo pasa a DATOS.
function leerListaCarrusel() {
  if (!DATOS.carrusel) return;
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
    tituloEn: "New slide",
    textoEn: "Slide text.",
    enlace: ""
  });
  mostrarListaCarrusel();
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
    DATOS.equipo[i].nombre = $("eqNombre" + i).value;
    DATOS.equipo[i].cargo = $("eqCargo" + i).value;
    DATOS.equipo[i].iniciales = $("eqIniciales" + i).value;

    // La sinopsis es un solo texto
    var sinopsis = $("eqSynopsis" + i);
    DATOS.equipo[i].sinopsis = sinopsis ? sinopsis.value.trim() : "";
  }
}

/* Quita una persona del equipo. */
function quitarIntegrante(indice) {
  if (!window.confirm("Quitar a esta persona del equipo?")) return;
  leerListaEquipo();
  DATOS.equipo.splice(indice, 1);
  mostrarListaEquipo();
}

/* Agrega una persona vacia al equipo. */
function agregarIntegrante() {
  leerListaEquipo();
  DATOS.equipo.push({
    nombre: "Nuevo integrante",
    cargo: "Cargo",
    iniciales: "NI",
    sinopsis: "Escriba aqui una sinopsis corta de su experiencia."
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
    $("vistaLogo").innerHTML = '<p class="pista">Todavia no hay un logotipo cargado.</p>';
    return;
  }
  $("vistaLogo").innerHTML = '<img class="logo-mini" src="' + DATOS.empresa.logo + '" alt="Logotipo actual">';
}

/* Cuando se elige una imagen, se lee y se muestra como logotipo.
   El FileReader es lo que lee el archivo que eligio la persona. */
function cambiarLogo(evento) {
  var archivo = evento.target.files[0];
  if (!archivo) return;

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

/* Dibuja la lista de solicitudes con los datos de cada una. */
function mostrarSolicitudes() {
  var solicitudes = leerSolicitudes();
  var lista = $("listaSolicitudes");

  if (solicitudes.length === 0) {
    lista.innerHTML = '<p class="pista">Todavia no hay solicitudes registradas.</p>';
    return;
  }

  var html = "";
  for (var i = solicitudes.length - 1; i >= 0; i--) {
    var s = solicitudes[i];
    html += `
      <div class="item">
        <h3>${escapar(s.area || "Sin area")} ${s.fecha ? "- " + escapar(s.fecha) : ""}</h3>
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
  var solicitudes = leerSolicitudes();
  if (solicitudes.length === 0) {
    mostrarAviso("No hay solicitudes para descargar.", "error");
    return;
  }

  // Se arma una tabla que se puede abrir con Excel.
  var filas = [["Fecha", "Area", "Correo", "Telefono", "Nombre", "Mensaje", "Estado"]];
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
   7b. CAMBIAR Y RESTABLECER LA CONTRASENA
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
   7c. MOSTRAR U OCULTAR LA CONTRASENA
   -------------------------------------------------------
   El boton con el ojo cambia el campo entre "oculto" y
   "visible", para que la persona este segura de que
   escribio bien su contrasena.
   ======================================================= */

/* Muestra o esconde la contrasena de un campo. */
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
   8. INICIO DE SESION
   ======================================================= */

/* Entra al panel: revisa el usuario y la clave, y si estan bien
   muestra el panel y carga los datos. */
function entrar() {
  var usuario = $("usuario").value.trim();
  var clave = $("clave").value;
  var aviso = $("loginAviso");

  if (usuario !== USUARIO || clave !== leerClaveAdmin()) {
    aviso.textContent = "Ese usuario o esa contrasena no son correctos.";
    aviso.className = "aviso error";
    return;
  }

  $("login").classList.add("oculto");
  $("panel").classList.remove("oculto");
  cargar();
}

/* ---------- Botones y formularios ---------- */
export function iniciarAdmin() {
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
    $("panel").classList.add("oculto");
    $("login").classList.remove("oculto");
    $("clave").value = "";
    $("loginAviso").textContent = "";
    $("loginAviso").className = "aviso";
    $("usuario").focus();
  });
}

Object.assign(window, { moverDiapositiva, quitarDiapositiva, quitarIntegrante, quitarPublicacion, quitarServicio, verClave });
