// jsdom no implementa matchMedia; el sitio lo usa para "reducir movimiento".
window.matchMedia = window.matchMedia || (() => ({
  matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {},
}));
window.scrollTo = () => {};
