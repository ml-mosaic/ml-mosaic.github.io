// Site settings. Every page loads this first.
window.MOSAIC = {
  // The m1 backend (website_backend). Pages on GitHub are served over HTTPS, so this must be an https:// address
  // (browsers block calls from an https page to an http API). Set it before publishing.
  production: "https://ala-port-description-limit.trycloudflare.com/",
};
// Developing locally (python3 -m http.server 3000)? Then talk to the backend on this machine.
MOSAIC.backend = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? "http://localhost:8000" : MOSAIC.production;
