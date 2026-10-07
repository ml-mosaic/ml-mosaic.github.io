// Site settings. Every page loads this first.
window.MOSAIC = {
  // The m1 backend (website_backend). Pages on GitHub are served over HTTPS, so this must be an https:// address
  // (browsers block calls from an https page to an http API). Set it before publishing.
<<<<<<< HEAD
  production: "https://server.tail8c8f14.ts.net",
=======
  production: "server.tail8c8f14.ts.net",
>>>>>>> e1928a45f7d5c409c368a13209ac1db531b76fe9
};
// Developing locally (python3 -m http.server 3000)? Then talk to the backend on this machine.
MOSAIC.backend = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? "http://localhost:8000" : MOSAIC.production;
