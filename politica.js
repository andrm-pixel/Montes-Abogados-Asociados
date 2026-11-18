/* Script de la política de datos (migrado). */

/* Textos de ayuda (title y aria-label) que también cambian de idioma.
   Cada par es [español, inglés]. */
var AYUDAS = [
  ["Iniciar sesión o registrarse", "Sign in or create an account"],
  ["Idioma de la página", "Change the page language"],
  ["Abrir menu", "Open menu"],
  ["Modo oscuro", "Dark mode"],
  ["Modo claro", "Light mode"],
  ["Cambiar entre modo claro y modo oscuro", "Switch between light and dark mode"],
  ["Cerrar", "Close"]
];

/* Pone los textos de ayuda en el idioma elegido. */
function traducirAyudas(idioma) {
  var lista = document.querySelectorAll("[title], [aria-label]");
  for (var i = 0; i < lista.length; i++) {
    for (var j = 0; j < AYUDAS.length; j++) {
      var buscado = idioma === "en" ? AYUDAS[j][0] : AYUDAS[j][1];
      var nuevo = idioma === "en" ? AYUDAS[j][1] : AYUDAS[j][0];
      if (lista[i].getAttribute("title") === buscado) {
        lista[i].setAttribute("title", nuevo);
      }
      if (lista[i].getAttribute("aria-label") === buscado) {
        lista[i].setAttribute("aria-label", nuevo);
      }
    }
  }
  document.documentElement.setAttribute("lang", idioma);
}

export function iniciarPolitica() {

    (function () {
      try {
        var temaCheck = document.getElementById("tema-oscuro");
        var idiomaEs = document.getElementById("idioma-es");
        var idiomaEn = document.getElementById("idioma-en");
        if (localStorage.getItem("tema") === "oscuro" && temaCheck) {
          temaCheck.checked = true;
        }
        if (localStorage.getItem("idioma") === "en" && idiomaEn) {
          idiomaEn.checked = true;
        }
        traducirAyudas(idiomaEn && idiomaEn.checked ? "en" : "es");
        if (temaCheck) {
          temaCheck.addEventListener("change", function () {
            localStorage.setItem("tema", temaCheck.checked ? "oscuro" : "claro");
          });
        }
        if (idiomaEs) {
          idiomaEs.addEventListener("change", function () {
            if (idiomaEs.checked) {
              localStorage.setItem("idioma", "es");
              traducirAyudas("es");
            }
          });
        }
        if (idiomaEn) {
          idiomaEn.addEventListener("change", function () {
            if (idiomaEn.checked) {
              localStorage.setItem("idioma", "en");
              traducirAyudas("en");
            }
          });
        }
      } catch (e) {}
    })();
  
}
