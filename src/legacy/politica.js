/* Script de la política de datos (migrado). */
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
        if (temaCheck) {
          temaCheck.addEventListener("change", function () {
            localStorage.setItem("tema", temaCheck.checked ? "oscuro" : "claro");
          });
        }
        if (idiomaEs) {
          idiomaEs.addEventListener("change", function () {
            if (idiomaEs.checked) localStorage.setItem("idioma", "es");
          });
        }
        if (idiomaEn) {
          idiomaEn.addEventListener("change", function () {
            if (idiomaEn.checked) localStorage.setItem("idioma", "en");
          });
        }
      } catch (e) {}
    })();
  
}
