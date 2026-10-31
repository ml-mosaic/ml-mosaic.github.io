/* Copyright (c) 2026 Mosaic. All rights reserved. Source-available under the Mosaic Source-Available License
   (LICENSE.md): viewing only; no copying, reuse or redistribution of this code or its design. */
// Site settings. Every page loads this first.
window.MOSAIC = {
  // The m1 backend (website_backend). Pages on GitHub are served over HTTPS, so this must be an https:// address
  // (browsers block calls from an https page to an http API). Set it before publishing.
  production: "https://server.tail8c8f14.ts.net",
  // The public, friendly API link. GitHub Pages can only forward browsers (not curl), so code samples keep using
  // `production` directly.
  apiLink: "https://ml-mosaic.github.io/api",
};
// Developing locally (python3 -m http.server 3000)? Then talk to the backend on this machine.
MOSAIC.backend = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? "http://localhost:8000" : MOSAIC.production;
