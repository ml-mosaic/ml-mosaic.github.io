/* Copyright (c) 2026 Mosaic. All rights reserved. Source-available under the Mosaic Source-Available License
   (LICENSE.md): viewing only; no copying, reuse or redistribution of this code or its design. */
// The site in the visitor's language. Pages are written in English; this swaps the English for a translation from
// assets/i18n/<lang>.json, element by element, as the page builds itself (a MutationObserver catches what scripts add
// later). The language comes from, in order: the visitor's own choice (the picker in the top bar), their country (the
// same /api/geo lookup the prices use), their browser's language, else English. Prompts, names and posts stay as
// written: only the site's own words are translated. Load right after config.js.
window.I18n = (() => {
  const LANGS = { en: "English", zh: "简体中文", ja: "日本語", ko: "한국어", es: "Español", pt: "Português", fr: "Français", de: "Deutsch", id: "Bahasa Indonesia" };
  const BY_COUNTRY = { CN: "zh", JP: "ja", KR: "ko", ID: "id", BR: "pt", PT: "pt", AO: "pt", MZ: "pt", FR: "fr", BE: "fr", LU: "fr", MC: "fr", SN: "fr", CI: "fr",
    DE: "de", AT: "de", CH: "de", LI: "de", ES: "es", MX: "es", AR: "es", CO: "es", CL: "es", PE: "es", VE: "es", EC: "es", GT: "es", CU: "es", BO: "es",
    DO: "es", HN: "es", PY: "es", SV: "es", NI: "es", CR: "es", PA: "es", UY: "es", PR: "es" };
  const KEY = "mosaic-lang";
  const root = document.currentScript?.dataset.root ?? (document.currentScript?.src.replace(/assets\/i18n\.js.*$/, "") || "");
  let dict = null, res = [], lang = "en";
  const norm = s => s.replace(/\s+/g, " ").trim();

  async function country() {
    try { const s = sessionStorage.getItem("mosaic-country"); if (s != null) return s || null; } catch (_) {}
    if (!window.MOSAIC?.backend) return null;
    try {
      const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 2500);
      const d = await fetch(`${MOSAIC.backend}/api/geo`, { signal: ctl.signal }).then(r => r.json()).finally(() => clearTimeout(t));
      const c = typeof d.country === "string" ? d.country.toUpperCase() : "";
      try { sessionStorage.setItem("mosaic-country", c); } catch (_) {}
      return c || null;
    } catch (_) { return null; }
  }
  async function pick() {
    try { const v = localStorage.getItem(KEY); if (v && LANGS[v]) return v; } catch (_) {}
    const c = await country();
    if (c) return BY_COUNTRY[c] || "en";
    for (const l of navigator.languages || [navigator.language]) { const k = (l || "").slice(0, 2).toLowerCase(); if (LANGS[k]) return k; }
    return "en";
  }

  // ---------------------------------------------------------------- translating the page
  const INLINE = new Set(["B", "I", "SPAN", "SMALL", "EM", "STRONG", "BR", "SUP", "SUB"]);
  const SKIP = new Set(["SCRIPT", "STYLE", "SVG", "CANVAS", "CODE", "PRE"]);
  const FIELD = new Set(["INPUT", "TEXTAREA"]);          // their placeholder and labels, never what was typed
  const isInline = c => INLINE.has(c.tagName) ? !c.id && !(c.className && String(c.className).includes("ic")) : c.tagName === "A" && !c.className && !c.id;
  const leafy = el => [...el.children].every(c => isInline(c) && leafy(c));
  const done = new WeakMap();                      // element/text node -> what we set (so our own changes aren't redone)

  function lookup(s) {
    if (!s || !/[A-Za-z]/.test(s)) return null;
    if (Object.prototype.hasOwnProperty.call(dict, s)) return dict[s];
    for (const [re, to] of res) if (re.test(s)) return s.replace(re, to);
    return null;
  }
  function attrs(el) {
    for (const a of ["placeholder", "title", "aria-label"]) {
      const v = el.getAttribute?.(a);
      if (!v) continue;
      const t = lookup(norm(v));
      if (t != null && t !== v) el.setAttribute(a, t);
    }
  }
  function walk(el) {
    if (el.nodeType !== 1 || SKIP.has(el.tagName) || el.closest("[data-noi18n],.kx-drop")) return;
    attrs(el);
    if (FIELD.has(el.tagName)) return;
    if (el.children.length && leafy(el) || (!el.children.length && el.textContent.trim())) {
      const h = norm(el.innerHTML);
      if (done.get(el) === h) return;
      const t = lookup(h);
      if (t != null) { el.innerHTML = t; done.set(el, norm(el.innerHTML)); return; }
      if (!el.children.length) return;
    }
    for (const c of [...el.children]) walk(c);
    for (const n of el.childNodes) if (n.nodeType === 3) text(n);
  }
  function text(n) {
    const raw = n.nodeValue;
    if (done.get(n) === raw || !/[A-Za-z]{2}/.test(raw)) return;
    const t = lookup(norm(raw));
    if (t == null) return;
    const lead = raw.match(/^\s*/)[0], trail = raw.match(/\s*$/)[0];
    n.nodeValue = lead + t + trail;
    done.set(n, n.nodeValue);
  }
  let queued = new Set(), raf = 0;
  function later(node) {
    queued.add(node);
    if (!raf) raf = requestAnimationFrame(() => {
      raf = 0;
      const list = [...queued]; queued = new Set();
      for (const n of list) if (n.isConnected) n.nodeType === 3 ? text(n) : walk(n);
    });
  }

  // ---------------------------------------------------------------- fonts: CJK glyphs (Tiny5 is Latin only)
  function fonts() {
    if (!["zh", "ja", "ko"].includes(lang)) return;
    const fam = lang === "ko" ? "Apple SD Gothic Neo" : "DotGothic16";
    if (lang !== "ko") document.head.appendChild(Object.assign(document.createElement("link"), { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=DotGothic16&display=swap" }));
    document.head.appendChild(Object.assign(document.createElement("style"), { textContent:
      `body, button, input, textarea, select { font-family: "Tiny5", "${fam}", ${lang === "ko" ? '"Malgun Gothic", ' : ""}ui-monospace, monospace !important; }` }));
  }

  // ---------------------------------------------------------------- the picker (in the top bar, next to your name)
  function picker() {
    const host = ["nav.topbar .who", ".who", "nav .links"].map(q => document.querySelector(q)).find(Boolean);
    if (!host || host.querySelector(".i18n-pick")) return;
    const css = `.i18n-pick { position: relative; display: inline-flex; margin-right: 6px; font-family: "Tiny5", ui-monospace, monospace; }
      .i18n-pick > button { background: none; border: 0; color: #8a867b; cursor: pointer; font: inherit; font-size: 13px; padding: 4px 6px; letter-spacing: 1px; }
      .i18n-pick > button:hover { color: #fff; }
      .i18n-pick ul { position: absolute; right: 0; top: calc(100% + 8px); z-index: 70; list-style: none; margin: 0; padding: 6px; background: #120f17; min-width: 170px;
                      box-shadow: 0 -4px 0 0 #2e2838, 0 4px 0 0 #2e2838, -4px 0 0 0 #2e2838, 4px 0 0 0 #2e2838; }
      .i18n-pick li button { display: block; width: 100%; text-align: left; background: none; border: 0; color: #e8e4f0; padding: 8px 10px; cursor: pointer;
                             font-family: "Tiny5", "DotGothic16", "Apple SD Gothic Neo", "Malgun Gothic", ui-monospace, monospace; font-size: 14px; }
      .i18n-pick li button:hover, .i18n-pick li button[aria-current="true"] { background: #221d2c; color: #fff; }`;
    document.head.appendChild(Object.assign(document.createElement("style"), { textContent: css }));
    const box = document.createElement("span"); box.className = "i18n-pick"; box.dataset.noi18n = "";
    box.innerHTML = `<button type="button" aria-haspopup="listbox" title="Language">&#x1F310; ${lang.toUpperCase()}</button><ul hidden role="listbox">${
      Object.entries(LANGS).map(([k, v]) => `<li><button type="button" data-l="${k}" aria-current="${k === lang}">${v}</button></li>`).join("")}</ul>`;
    host.prepend(box);
    const list = box.querySelector("ul");
    box.querySelector("button").onclick = e => { e.stopPropagation(); list.hidden = !list.hidden; };
    addEventListener("click", () => list.hidden = true);
    list.querySelectorAll("[data-l]").forEach(b => b.onclick = () => {
      try { localStorage.setItem(KEY, b.dataset.l); } catch (_) {}
      location.reload();
    });
  }

  // ---------------------------------------------------------------- start
  const ready = (async () => {
    lang = await pick();
    document.documentElement.lang = lang;
    const start = () => setTimeout(picker, 0);
    if (lang === "en") { document.readyState === "loading" ? addEventListener("DOMContentLoaded", start) : start(); return lang; }
    try {
      const d = await fetch(`${root}assets/i18n/${lang}.json?v=20261101a`).then(r => r.json());
      dict = d.t || {};
      res = (d.re || []).map(([p, to]) => [new RegExp(p), to]);
    } catch (_) { lang = "en"; return lang; }
    fonts();
    const go = () => {
      walk(document.body);
      document.title = lookup(document.title) ?? document.title;
      new MutationObserver(ms => ms.forEach(m => {
        if (m.type === "characterData") later(m.target);
        else if (m.type === "attributes") attrs(m.target);
        else m.addedNodes.forEach(n => (n.nodeType === 1 || n.nodeType === 3) && later(n));
        if (m.type === "childList" && m.target.nodeType === 1 && !m.target.closest(".i18n-pick")) later(m.target);
      })).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["placeholder", "title", "aria-label"] });
      picker();
    };
    document.readyState === "loading" ? addEventListener("DOMContentLoaded", go) : go();
    return lang;
  })();
  const t = s => (dict && lookup(s)) ?? s;          // for scripts that want a translated string directly
  return { ready, t, LANGS, get lang() { return lang; } };
})();
