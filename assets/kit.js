/* Copyright (c) 2026 Mosaic. All rights reserved. Source-available under the Mosaic Source-Available License
   (LICENSE.md): viewing only; no copying, reuse or redistribution of this code or its design. */
// Shared bits for the app pages: the top bar, pixel avatars, critters whose eyes follow the cursor, toasts.
// Load after config.js and session.js. `Kit.root` is the path back to the site root ("../" from a sub-page).
window.Kit = (() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const root = document.currentScript?.dataset.root ?? "../";
  const rand = (a, b) => a + Math.random() * (b - a), pick = a => a[Math.floor(Math.random() * a.length)];

  // ---------------------------------------------------------------- top bar
  function nav(active) {
    const el = document.querySelector("nav.topbar");
    if (!el) return;
    const me = Session.current();
    const links = [["Home", "", "opt"], ["Studio", "studio/", ""], ["Pricing", "pricing/", ""], ["Forum", "forum/", "opt"], ["Blog", "blog/", "opt"],
                   ["Dev portal", "portal/", "opt"], ["Status", "status/", "opt"]];
    if (me) links.splice(6, 0, ["Keys", "portal/keys/", "opt"]);
    el.innerHTML = `<div class="wrap">
      <a class="brand" href="${root}" aria-label="Mosaic home"><img src="${root}assets/logo-wordmark.png" alt="Mosaic"></a>
      <div class="links">${links.map(([t, h, c]) => `<a class="${c}" href="${root}${h}"${t === active ? ' aria-current="page"' : ""}>${t}</a>`).join("")}</div>
      <div class="who">${me
        ? `<div class="kit-me"><a class="me" href="${root}settings/" aria-haspopup="menu" title="Your account"><img class="avatar" id="kit-avatar" src="${avatar(me.username)}" alt=""><span class="name" id="kit-name">${esc(me.username)}</span><span class="kit-chev">&#9662;</span></a></div>`
        : `<a class="btn small" href="${root}login/">Sign in</a>`}</div></div>`;
    if (me) {
      profileMenu(el.querySelector(".kit-me"));
      whoami().then(u => {
        if (!u) return;
        el.querySelector("#kit-avatar").src = pfp({ username: u.username, avatar: u.profile.avatar });
        el.querySelector("#kit-name").textContent = u.profile.display_name;
      });
    }
  }
  // the menu under your picture (hover, focus or tap): Settings, Gift, Sign out. Any page can attach it to its own
  // "who" element (the front page has its own top bar).
  function profileMenu(box) {
    if (!box || box.querySelector(".kit-menu")) return;
    box.classList.add("kit-me");
    const m = document.createElement("div");
    m.className = "kit-menu"; m.setAttribute("role", "menu");
    m.innerHTML = `<a role="menuitem" href="${root}settings/"><i class="ic ic-gear"></i>Settings</a>
      <button role="menuitem" type="button" data-gift><i class="ic ic-gift"></i>Gift a ticket</button>
      <a role="menuitem" href="${root}forum/"><i class="ic ic-chat"></i>Forum</a>
      <button role="menuitem" type="button" data-out><i class="ic ic-door"></i>Sign out</button>`;
    box.appendChild(m);
    const trigger = box.querySelector("a,button");
    let t;
    const open = () => { clearTimeout(t); box.classList.add("open"); };
    const close = () => { t = setTimeout(() => box.classList.remove("open"), 180); };
    box.addEventListener("pointerenter", open); box.addEventListener("pointerleave", close);
    box.addEventListener("focusin", open); box.addEventListener("focusout", e => { if (!box.contains(e.relatedTarget)) close(); });
    trigger.addEventListener("click", e => {                        // touch screens: first tap opens the menu
      if (matchMedia("(hover: none)").matches && !box.classList.contains("open")) { e.preventDefault(); open(); }
    });
    m.querySelector("[data-gift]").onclick = () => { box.classList.remove("open"); gift(); };
    m.querySelector("[data-out]").onclick = async () => { await Session.signOut(); location.href = root; };
  }
  // the signed-in user (profile + today's allowance), fetched once per page
  let mePromise = null;
  function whoami(refresh = false) {
    if (!Session.current()) return Promise.resolve(null);
    if (!mePromise || refresh) mePromise = Session.api("/api/me").then(r => r.ok ? r.data : null);
    return mePromise;
  }
  // tags next to a person's name: staff ("Developer") and paid plans ("Artisan", "Atelier"), each in its own colours
  const tags = person => (person?.badges || []).map(b => `<span class="utag utag-${esc(b.toLowerCase().replace(/[^a-z0-9]/g, ""))}">${esc(b)}</span>`).join("");
  // a person's picture: their own upload / m1 sprite from the backend, else the pixel pattern made from their name
  function pfp(person, px = 8) {
    return person.avatar ? MOSAIC.backend + person.avatar : avatar(person.username, px);
  }

  // ---------------------------------------------------------------- pixel avatars: a mirrored 5x5 pattern from the name
  const avatarCache = {};
  function avatar(name, px = 8) {
    const key = name + px;
    if (avatarCache[key]) return avatarCache[key];
    let h = 2166136261;
    for (const ch of name) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
    const hue = h % 360, c = document.createElement("canvas");
    c.width = c.height = 7 * px;
    const g = c.getContext("2d");
    g.fillStyle = `hsl(${hue} 45% 18%)`; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = `hsl(${hue} 80% 66%)`;
    for (let y = 0; y < 5; y++) for (let x = 0; x < 3; x++) {
      if ((h >>> (y * 3 + x)) & 1) { g.fillRect((1 + x) * px, (1 + y) * px, px, px); g.fillRect((5 - x) * px, (1 + y) * px, px, px); }
    }
    return avatarCache[key] = c.toDataURL();
  }

  // ---------------------------------------------------------------- critters
  const critters = [];
  function critter(a, parent, { left, top, right, bottom, P = 4, say = true } = {}) {
    const el = document.createElement("button");
    el.type = "button"; el.className = "critter"; el.setAttribute("aria-label", `say hi to the ${a.name.replace("-", " ")}`);
    Object.assign(el.style, { width: a.w * P + "px", height: a.h * P + "px", backgroundImage: `url(${root}assets/scenes/${a.name}.png)` });
    for (const [k, v] of Object.entries({ left, top, right, bottom })) if (v !== undefined) el.style[k] = v;
    const eyes = a.eyes.map(r => {
      const e = document.createElement("span"); e.className = "eye";
      Object.assign(e.style, { left: r.x * P + "px", top: r.y * P + "px", width: r.w * P + "px", height: r.h * P + "px" });
      const p = document.createElement("span"); p.className = "pupil";
      Object.assign(p.style, { width: a.pupil[0] * P + "px", height: a.pupil[1] * P + "px",
                               left: (r.w - a.pupil[0]) / 2 * P + "px", top: Math.floor((r.h - a.pupil[1]) / 2) * P + "px" });
      const lid = document.createElement("span"); lid.className = "lid"; lid.style.background = a.lid; lid.style.boxShadow = `inset 0 -${P}px 0 0 #14121a`;
      e.append(p, lid); el.appendChild(e); return { e, p, r };
    });
    if (say) el.addEventListener("click", ev => { ev.stopPropagation(); talk(el, pick(a.words)); hop(el); });
    parent.appendChild(el);
    const c = { el, eyes, a, P }; critters.push(c); return c;
  }
  addEventListener("pointermove", e => critters.forEach(c => c.eyes.forEach(({ e: eye, p, r }) => {
    const b = eye.getBoundingClientRect();
    if (!b.width || b.bottom < -200 || b.top > innerHeight + 200) return;
    const rx = (r.w - c.a.pupil[0]) / 2, ry = (r.h - c.a.pupil[1]) / 2, R = 180;
    const dx = e.clientX - (b.left + b.width / 2), dy = e.clientY - (b.top + b.height / 2);
    p.style.left = Math.round(rx + Math.max(-1, Math.min(1, dx / R)) * rx) * c.P + "px";
    p.style.top = Math.round(ry + Math.max(-1, Math.min(1, dy / R)) * ry) * c.P + "px";
  })));
  (function blinkLoop() {
    const live = critters.filter(c => c.el.isConnected);
    if (live.length && !reduce) { const c = pick(live); c.el.classList.add("blink"); setTimeout(() => c.el.classList.remove("blink"), 150); }
    setTimeout(blinkLoop, rand(700, 2000));
  })();
  function talk(el, text, ms = 1500) {
    const r = el.getBoundingClientRect(), s = document.createElement("div");
    s.className = "kit-say"; s.textContent = text; s.style.left = r.left + r.width / 2 + "px"; s.style.top = r.top - 8 + "px";
    s.style.animationDuration = ms + "ms";
    document.body.appendChild(s); setTimeout(() => s.remove(), ms);
  }
  function hop(el, h = 14) {
    if (!reduce) el.animate([{ transform: "none" }, { transform: `translateY(-${h}px)` }, { transform: "none" }], { duration: 300, easing: "steps(3)" });
  }
  // little sprites (hearts, leaves, z's) that float up from a point and fade, in whole-pixel steps
  function burst(x, y, sprite, n = 5, { size = 4, rise = 70, spread = 50 } = {}) {
    if (reduce) return;
    for (let i = 0; i < n; i++) {
      const im = new Image(); im.src = `${root}assets/scenes/p-${sprite}.png`; im.className = "kit-float";
      im.onload = () => { im.style.width = im.naturalWidth * size + "px"; };
      im.style.left = x + "px"; im.style.top = y + "px"; document.body.appendChild(im);
      const dx = rand(-spread, spread), dy = -rise * rand(.6, 1.2);
      im.animate([{ transform: "translate(-50%, -50%)", opacity: 1 }, { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`, opacity: 0 }],
                 { duration: rand(700, 1100), delay: i * 60, easing: "steps(6)", fill: "both" }).onfinish = () => im.remove();
    }
  }

  // ---------------------------------------------------------------- dialogs: our own confirm() / alert(), with an animal peeking over
  let scenesP = null;
  const peekers = () => scenesP || (scenesP = json(`${root}assets/scenes/scenes.json`).then(l => l.map(x => x.animal)).catch(() => []));
  function dialog({ title = "Hey!", message = "", ok = "OK", cancel = null, danger = false } = {}) {
    return new Promise(resolve => {
      const prev = document.activeElement;
      const d = document.createElement("div");
      d.className = "kit-dlg"; d.setAttribute("role", cancel ? "alertdialog" : "dialog"); d.setAttribute("aria-modal", "true");
      d.innerHTML = `<div class="card notch" style="--tone:${danger ? "var(--bad)" : "#3a3346"}"><div class="peek"></div>
        <h3>${esc(title)}</h3><p>${esc(message)}</p>
        <div class="row">${cancel ? `<button class="btn ghost" type="button" data-v="0">${esc(cancel)}</button>` : ""}
          <button class="btn" type="button" data-v="1" style="--c:${danger ? "var(--bad)" : "var(--yellow)"}">${esc(ok)}</button></div></div>`;
      document.body.appendChild(d);
      peekers().then(list => { if (list.length && d.isConnected) critter(pick(list), d.querySelector(".peek"), { P: 3, say: false }); });
      const done = v => { removeEventListener("keydown", key, true); d.remove(); prev?.focus?.(); resolve(v); };
      const key = e => {
        if (e.key === "Escape") { e.preventDefault(); done(false); }
        else if (e.key === "Tab") {                                   // keep focus inside the dialog
          const bs = [...d.querySelectorAll("button")], i = bs.indexOf(document.activeElement);
          e.preventDefault(); bs[(i + (e.shiftKey ? -1 : 1) + bs.length) % bs.length].focus();
        }
      };
      addEventListener("keydown", key, true);
      d.addEventListener("click", e => { const b = e.target.closest("[data-v]"); if (b) done(b.dataset.v === "1"); else if (e.target === d && cancel) done(false); });
      (cancel && danger ? d.querySelector('[data-v="0"]') : d.querySelector('[data-v="1"]')).focus();
    });
  }
  const confirmBox = (message, o = {}) => dialog({ title: "Are you sure?", ok: "Yes", cancel: "Never mind", ...o, message });
  const alertBox = (message, o = {}) => dialog({ title: "Heads up", ok: "Got it", ...o, message });

  // ---------------------------------------------------------------- misc
  function toast(msg, ms = 2400) {
    let t = document.querySelector(".toast");
    if (!t) { t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add("show"); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("show"), ms);
  }
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  function ago(t) {
    const s = Date.now() / 1000 - t;
    if (s < 60) return "just now";
    for (const [u, n] of [["d", 86400], ["h", 3600], ["m", 60]]) if (s >= n) return `${Math.floor(s / n)}${u} ago`;
  }
  const json = url => fetch(url).then(r => r.json());


  // ================================================================ popups that work on every page (own styles: the
  // front page doesn't load kit.css): gift a ticket, report something, confetti for a new plan or a ticket
  const CSS = `
  .kit-me { position: relative; }
  .kit-me .kit-chev { color: #6f6880; font-size: 11px; }
  .kit-menu { position: absolute; right: 0; top: calc(100% + 8px); z-index: 60; min-width: 190px; background: #120f17; padding: 6px; display: none;
              box-shadow: 0 -4px 0 0 #2e2838, 0 4px 0 0 #2e2838, -4px 0 0 0 #2e2838, 4px 0 0 0 #2e2838, 0 12px 0 0 rgba(0,0,0,.35); font-family: "Tiny5", ui-monospace, monospace; }
  .kit-me.open .kit-menu { display: block; animation: kpop .14s steps(3); }
  .kit-menu::before { content: ""; position: absolute; right: 18px; top: -12px; width: 8px; height: 8px; background: #2e2838; }
  .kit-menu a, .kit-menu button { display: flex; align-items: center; gap: 10px; width: 100%; background: none; border: 0; text-decoration: none; color: #e8e4f0;
              padding: 9px 10px; font: inherit; font-size: 14px; cursor: pointer; text-align: left; }
  .kit-menu a:hover, .kit-menu button:hover, .kit-menu a:focus-visible, .kit-menu button:focus-visible { background: #221d2c; color: #fff; outline: none; }
  .kit-menu .ic { width: 12px; height: 12px; flex: none; background: var(--ic) 0 0 / 100% 100%; image-rendering: pixelated; }
  .ic-gear { --ic: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 6 6' shape-rendering='crispEdges'%3E%3Cpath fill='%23b9b0c8' d='M2 0h2v1h1v1h1v2h-1v1h-1v1h-2v-1h-1v-1h-1v-2h1v-1h1zM2 2v2h2v-2z'/%3E%3C/svg%3E"); }
  .ic-gift { --ic: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 6 6' shape-rendering='crispEdges'%3E%3Cpath fill='%23f87898' d='M0 1h6v2h-6zM1 3h4v3h-4z'/%3E%3Cpath fill='%23fce060' d='M2.5 1h1v5h-1zM1 0h1v1h-1zM4 0h1v1h-1z'/%3E%3C/svg%3E"); }
  .ic-chat { --ic: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 6 6' shape-rendering='crispEdges'%3E%3Cpath fill='%235cacfc' d='M0 0h6v4h-3v1h-1v1h-1v-2h-1z'/%3E%3C/svg%3E"); }
  .ic-door { --ic: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 6 6' shape-rendering='crispEdges'%3E%3Cpath fill='%238a867b' d='M1 0h4v6h-4z'/%3E%3Cpath fill='%23fce060' d='M3.5 3h1v1h-1z'/%3E%3C/svg%3E"); }
  @keyframes kpop { from { transform: translateY(6px); opacity: 0; } }

  .kx-back { position: fixed; inset: 0; z-index: 110; display: grid; place-items: center; padding: 18px; overflow-y: auto; background: rgba(0,0,0,.8);
             font-family: "Tiny5", ui-monospace, monospace; -webkit-font-smoothing: none; color: #e8e4f0; animation: kfade .16s steps(3); }
  @keyframes kfade { from { opacity: 0; } }
  .kx-card { position: relative; width: min(var(--w, 520px), 100%); background: #120f17; animation: kpop2 .22s steps(4);
             box-shadow: 0 -4px 0 0 var(--b, #2e2838), 0 4px 0 0 var(--b, #2e2838), -4px 0 0 0 var(--b, #2e2838), 4px 0 0 0 var(--b, #2e2838); }
  @keyframes kpop2 { from { transform: translateY(18px) scale(.95); opacity: 0; } }
  .kx-x { position: absolute; top: 8px; right: 10px; z-index: 6; background: rgba(0,0,0,.45); border: 0; color: #fff; font: inherit; font-size: 20px; width: 34px; height: 34px; cursor: pointer; }
  .kx-stage { position: relative; height: 150px; overflow: hidden; image-rendering: pixelated; background: var(--sky); }
  .kx-stage::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 22px; z-index: 1; background: var(--floor); }
  .kx-body { padding: 20px 24px 22px; }
  .kx-tag { display: inline-block; font-size: 11px; letter-spacing: 2px; padding: 4px 9px; background: var(--b, #2e2838); color: var(--tf, #fff); }
  .kx-body h2 { font-weight: normal; font-size: clamp(24px, 5vw, 34px); margin: 10px 0 6px; line-height: 1.1; color: #fff; }
  .kx-body p { color: #b9b0c8; line-height: 1.55; margin: 0 0 14px; font-size: 15px; }
  .kx-body label { display: block; font-size: 12px; letter-spacing: 2px; color: #8f86a0; margin: 14px 0 6px; }
  .kx-body input, .kx-body textarea { width: 100%; background: #1d1826; border: 0; outline: none; color: #fff; padding: 10px 12px; font: inherit; font-size: 15px; }
  .kx-body textarea { resize: vertical; min-height: 84px; line-height: 1.45; }
  .kx-body input:focus, .kx-body textarea:focus { box-shadow: 0 0 0 2px var(--c, #f87898); }
  .kx-row { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-top: 18px; }
  .kx-btn { display: inline-block; text-decoration: none; border: 0; cursor: pointer; padding: 12px 20px; font: inherit; font-size: 16px; letter-spacing: 1px;
            background: var(--c, #f87898); color: #000; box-shadow: inset 0 -4px 0 0 rgba(0,0,0,.3); }
  .kx-btn:hover { filter: brightness(1.1); } .kx-btn[disabled] { filter: saturate(.3) brightness(.7); cursor: wait; }
  .kx-btn.ghost { background: transparent; color: #fff; box-shadow: inset 0 0 0 3px #3a3446; }
  .kx-note { color: #8f86a0; font-size: 12px; line-height: 1.5; margin: 12px 0 0; } .kx-note a { color: #e8e4f0; }
  .kx-err { color: #ff8a7a; font-size: 14px; margin: 10px 0 0; min-height: 1em; }
  .kx-chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .kx-chips button { background: #1d1826; border: 0; color: #b9b0c8; padding: 8px 11px; font: inherit; font-size: 13px; cursor: pointer; }
  .kx-chips button:hover { color: #fff; } .kx-chips button[aria-pressed="true"] { background: var(--c, #f87898); color: #000; }
  .kx-say { position: absolute; z-index: 5; background: #fff; color: #000; font-size: 14px; padding: 5px 10px; white-space: nowrap; transform: translateX(-50%); }
  .kx-say::after { content: ""; position: absolute; left: 50%; bottom: -6px; width: 6px; height: 6px; background: #fff; transform: translateX(-50%); }
  .kx-ticket { display: block; width: 100%; max-width: 450px; margin: 4px auto 2px; image-rendering: pixelated; filter: drop-shadow(6px 6px 0 rgba(0,0,0,.4)); }
  .kx-sent { margin: 18px 0 0; padding: 0; list-style: none; font-size: 13px; color: #b9b0c8; }
  .kx-sent li { display: flex; gap: 8px; align-items: center; padding: 7px 0; border-top: 2px solid #1d1826; }
  .kx-sent li b { font-weight: normal; color: #fff; } .kx-sent li .st { margin-left: auto; font-size: 11px; letter-spacing: 1px; padding: 2px 6px; background: #24212b; }
  .kx-sent li button { background: none; border: 0; color: #a69fb5; font: inherit; font-size: 12px; text-decoration: underline; cursor: pointer; }
  .kx-who { display: flex; align-items: center; gap: 12px; background: #1d1826; padding: 10px 12px; margin: 4px 0 14px; }
  .kx-who img { width: 40px; height: 40px; image-rendering: pixelated; }
  .kx-who b { font-weight: normal; color: #fff; font-size: 17px; } .kx-who span { display: block; color: #8f86a0; font-size: 12px; }
  .kx-perks { list-style: none; padding: 0; margin: 0 0 6px; }
  .kx-perks li { display: flex; gap: 10px; align-items: baseline; color: #d8d2c4; margin-bottom: 8px; font-size: 15px; line-height: 1.4; }
  .kx-perks li::before { content: ""; width: 8px; height: 8px; flex: none; background: var(--c, #f87898); transform: translateY(-1px); }
  .kx-confetti { position: fixed; inset: 0; z-index: 111; pointer-events: none; image-rendering: pixelated; width: 100%; height: 100%; }
  @media (max-width: 520px) { .kx-body { padding: 18px 16px 18px; } }`;
  document.head.appendChild(Object.assign(document.createElement("style"), { textContent: CSS }));

  const PLAN = {
    artisan: { name: "Artisan", mascot: "mascot-artisan", b: "#6b3a1c", tf: "#fff", c: "#e8913a",
               sky: "linear-gradient(#24140c 0 18%, #3a2014 18% 34%, #56301c 34% 50%, #8c4a22 50% 66%, #b8612a 66% 82%, #e8913a 82%)",
               floor: "linear-gradient(#a8672c 0 4px, #7c4a20 4px 8px, #4f2e14 8px)",
               perks: ["250 sprites every day", "The pro Studio: exact creativity, your own seeds", "Batches of 4 sprites", "Express: 5 super-fast goes a day", "Commercial use of what you make", "Gift a week of Artisan to a friend"] },
    atelier: { name: "Atelier", mascot: "mascot-atelier", b: "#2c3c74", tf: "#fce060", c: "#fce060",
               sky: "linear-gradient(#0c0c2c 0 22%, #141c44 22% 44%, #1c2c5c 44% 66%, #2c3c74 66%)",
               floor: "linear-gradient(#3a4c8c 0 4px, #24305c 4px 8px, #141c44 8px)",
               perks: ["500 sprites and 50 v1 clips every day", "v1: little animated scenes", "10 prompts at once, batches of 8 sprites and 4 clips", "Express: 15 super-fast goes a day", "Commercial use of what you make", "Gift a week of Atelier to a friend"] },
    free: { name: "Free", mascot: "mascot-free", b: "#3a3446", tf: "#e8e4f0", c: "#f87898",
            sky: "linear-gradient(#18151e 0 25%, #26222f 25% 50%, #363142 50% 75%, #4a4458 75%)", floor: "linear-gradient(#5cc04a 0 4px, #3c9a3a 4px 8px, #6b4a2c 8px)", perks: [] },
  };
  const extrasP = () => json(`${root}assets/scenes/extras.json`).catch(() => ({}));
  const scenesP2 = () => json(`${root}assets/scenes/scenes.json`).catch(() => []);
  function sheet({ w = 520, b, tf, c, sky, floor, stage = true }) {
    const back = document.createElement("div");
    back.className = "kx-back"; back.setAttribute("role", "dialog"); back.setAttribute("aria-modal", "true");
    back.innerHTML = `<div class="kx-card" style="--w:${w}px;--b:${b || "#2e2838"};--tf:${tf || "#fff"};--c:${c || "#f87898"}">
      <button class="kx-x" type="button" aria-label="Close">&times;</button>${stage ? `<div class="kx-stage" style="--sky:${sky};--floor:${floor}"></div>` : ""}<div class="kx-body"></div></div>`;
    document.body.appendChild(back);
    const prev = document.activeElement;
    const close = () => { back.remove(); removeEventListener("keydown", key); prev?.focus?.(); back.dispatchEvent(new Event("closed")); };
    const key = e => { if (e.key === "Escape") close(); };
    addEventListener("keydown", key);
    back.addEventListener("click", e => { if (e.target === back || e.target.closest(".kx-x,[data-close]")) close(); });
    return { back, body: back.querySelector(".kx-body"), stage: back.querySelector(".kx-stage"), close };
  }
  // a critter standing on a popup's stage, saying something now and then
  function actor(stage, name, words, { P = 4, left = "50%" } = {}) {
    return Promise.all([extrasP(), scenesP2()]).then(([x, list]) => {
      const a = x[name] || list.find(s => s.animal.name === name)?.animal;
      if (!a || !stage.isConnected) return null;
      const c = critter({ ...a, words: words.length ? words : a.words }, stage, { left: `calc(${left} - ${a.w * P / 2}px)`, bottom: "18px", P });
      c.el.style.zIndex = 3;
      let i = 0;
      const sayNow = () => {
        if (!stage.isConnected) return;
        stage.querySelector(".kx-say")?.remove();
        const s = document.createElement("div"); s.className = "kx-say"; s.textContent = words[i++ % words.length];
        s.style.left = left; s.style.bottom = `${18 + a.h * P + 12}px`; stage.appendChild(s);
        hop(c.el);
      };
      sayNow();
      const t = setInterval(() => stage.isConnected ? sayNow() : clearInterval(t), 3200);
      return c;
    });
  }

  // ---------------------------------------------------------------- confetti: little pixel squares in the plan's colours
  function confetti(colors = ["#f87898", "#fce060", "#6ee07a", "#5cacfc", "#e8913a", "#ffffff"], ms = 3200) {
    if (reduce) return;
    const cv = document.createElement("canvas"); cv.className = "kx-confetti";
    const S = 4, W = Math.ceil(innerWidth / S), H = Math.ceil(innerHeight / S);
    cv.width = W; cv.height = H; document.body.appendChild(cv);
    const g = cv.getContext("2d"), bits = Array.from({ length: 140 }, () => ({
      x: rand(0, W), y: rand(-H * .6, -2), vx: rand(-.35, .35), vy: rand(.35, 1.1), c: pick(colors), w: Math.random() < .5 ? 1 : 2, t: rand(0, 6) }));
    const t0 = performance.now();
    (function frame(now) {
      g.clearRect(0, 0, W, H);
      const left = 1 - (now - t0) / ms;
      for (const b of bits) {
        b.x += b.vx + Math.sin((now / 300) + b.t) * .2; b.y += b.vy;
        g.globalAlpha = Math.max(0, Math.min(1, left * 2)); g.fillStyle = b.c;
        g.fillRect(Math.round(b.x), Math.round(b.y), b.w, Math.sin(now / 120 + b.t) > 0 ? 2 : 1);
      }
      if (left > 0) requestAnimationFrame(frame); else cv.remove();
    })(t0);
  }

  // ---------------------------------------------------------------- gift a ticket (Artisan / Atelier: a week of your plan)
  const GIFT_WORDS = ["You're awesome, like seriously.", "Sharing is caring!", "Someone's week just got better.", "Best. Friend. Ever.", "A gift? For them? Wow."];
  async function gift() {
    if (!Session.current()) { location.href = `${root}login/`; return; }
    const [g, u] = await Promise.all([Session.api("/api/gifts").then(r => r.ok ? r.data : null), whoami()]);
    if (!g) return toast("Couldn't reach Mosaic just now: try again in a moment.");
    const plan = g.plan === "atelier" ? "atelier" : g.plan === "artisan" ? "artisan" : "free", t = PLAN[plan];
    const { body, stage, close } = sheet({ b: t.b, tf: t.tf, c: t.c, sky: t.sky, floor: t.floor });
    actor(stage, t.mascot, g.can_gift ? GIFT_WORDS : ["Gifting comes with a plan!", "Artisan and Atelier can gift."], { P: 4 });
    if (!g.can_gift) {
      body.innerHTML = `<span class="kx-tag">GIFT A TICKET</span><h2>Give a week of your plan</h2>
        <p>${esc(g.why_not || "Gifting is part of the Artisan and Atelier plans.")}. Artisan and Atelier members can each send a friend a week of their plan, on them.</p>
        <div class="kx-row">${plan === "free" ? `<a class="kx-btn" href="${root}pricing/">See the plans</a>` : ""}<button class="kx-btn ghost" type="button" data-close>Okay</button></div>`;
      return;
    }
    const to = g.gift_to.map(p => p === "free" ? "Free" : "Artisan").join(" or ");
    const statusName = { unclaimed: "WAITING", active: "IN USE", ended: "ENDED", expired: "EXPIRED", cancelled: "TAKEN BACK" };
    body.innerHTML = `<span class="kx-tag">GIFT A TICKET</span><h2>A week of ${t.name}, on you</h2>
      <img class="kx-ticket" src="${root}assets/tickets/ticket-${plan}.png" alt="A ${t.name} ticket">
      <p>Your friend gets everything ${t.name} has for ${g.days} days, starting when they claim it. What they make uses <b style="color:#fff;font-weight:normal">your</b> daily allowance.
        You can gift to anyone on ${to}.</p>
      <label for="kx-to">THEIR MOSAIC USERNAME</label><input id="kx-to" maxlength="32" autocomplete="off" spellcheck="false" placeholder="e.g. pixelpal">
      <label for="kx-msg">A NOTE (OPTIONAL)</label><input id="kx-msg" maxlength="140" placeholder="happy making!">
      <p class="kx-err" id="kx-err"></p>
      <div class="kx-row"><button class="kx-btn" type="button" id="kx-send">Send the ticket</button><button class="kx-btn ghost" type="button" data-close>Not now</button></div>
      <p class="kx-note">They'll get an email with their ticket, and a little surprise next time they visit. Unclaimed tickets expire after 14 days. One ticket per person at a time.</p>
      ${g.sent.length ? `<ul class="kx-sent">${g.sent.slice(0, 6).map(x => `<li><b>@${esc(x.to.username)}</b> ${PLAN[x.plan]?.name || x.plan}
        <span class="st">${statusName[x.status] || x.status.toUpperCase()}</span>${x.status === "unclaimed" ? `<button type="button" data-cancel="${esc(x.id)}">take back</button>` : ""}</li>`).join("")}</ul>` : ""}`;
    const send = body.querySelector("#kx-send"), err = body.querySelector("#kx-err");
    body.querySelector("#kx-to").focus();
    body.querySelectorAll("[data-cancel]").forEach(b => b.onclick = async () => {
      const r = await Session.api(`/api/gifts/${b.dataset.cancel}/cancel`, { method: "POST" });
      if (!r.ok) return toast(Session.detail(r.data));
      b.closest("li").querySelector(".st").textContent = "TAKEN BACK"; b.remove(); toast("Ticket taken back");
    });
    const go = async () => {
      const name = body.querySelector("#kx-to").value.trim().replace(/^@/, "");
      if (!name) return err.textContent = "Who's it for? Type their username.";
      send.disabled = true; err.textContent = "";
      const r = await Session.api("/api/gifts", { json: { to: name, message: body.querySelector("#kx-msg").value.trim() } });
      send.disabled = false;
      if (!r.ok) return err.textContent = Session.detail(r.data);
      close(); confetti([t.c, "#ffffff", "#f87898", "#6ee07a"]);
      toast(`Ticket sent to @${r.data.to.username}!`, 3200);
    };
    send.onclick = go;
    body.querySelectorAll("input").forEach(i => i.addEventListener("keydown", e => { if (e.key === "Enter") go(); }));
  }

  // ---------------------------------------------------------------- report something (the cat keeps you company)
  const REASONS = [["sexual", "Sexual content"], ["minors", "Involves a minor"], ["violence", "Graphic violence or gore"], ["hate", "Hate or harassment"],
                   ["illegal", "Something illegal"], ["copyright", "Copies someone else's work"], ["spam", "Spam or scams"], ["other", "Something else"]];
  function report({ kind, target, what = "this" }) {
    if (!Session.current()) { location.href = `${root}login/`; return; }
    const { body, stage, close } = sheet({ w: 500, b: "#3a2430", c: "#ff8a7a", sky: "linear-gradient(#1a1220 0 30%, #24182c 30% 60%, #2e1e36 60%)",
                                          floor: "linear-gradient(#4a3a52 0 4px, #362a3e 4px 8px, #241c2a 8px)" });
    actor(stage, "cat", ["I'll keep you company.", "You did the right thing.", "We read every report."], { P: 4, left: "30%" });
    body.innerHTML = `<span class="kx-tag">REPORT</span><h2>Report ${esc(what)}</h2>
      <p>Tell us what's wrong. A real person on the Mosaic team looks at every report, and the person you're reporting won't know it was you.</p>
      <label>WHAT'S THE PROBLEM?</label><div class="kx-chips" id="kx-reasons">${REASONS.map(([k, l]) => `<button type="button" data-r="${k}" aria-pressed="false">${l}</button>`).join("")}</div>
      <label for="kx-details">ANYTHING ELSE WE SHOULD KNOW? (OPTIONAL)</label><textarea id="kx-details" maxlength="1000" placeholder="Where it is, why it's a problem..."></textarea>
      <p class="kx-err" id="kx-err"></p>
      <div class="kx-row"><button class="kx-btn" type="button" id="kx-send">Send report</button><button class="kx-btn ghost" type="button" data-close>Cancel</button></div>
      <p class="kx-note">If someone is in danger, contact your local emergency services first. Reports are covered by the <a href="${root}terms/">Terms</a>.</p>`;
    let reason = null;
    body.querySelectorAll("[data-r]").forEach(b => b.onclick = () => {
      reason = b.dataset.r; body.querySelectorAll("[data-r]").forEach(x => x.setAttribute("aria-pressed", x === b)); });
    body.querySelector("#kx-send").onclick = async e => {
      if (!reason) return body.querySelector("#kx-err").textContent = "Pick what the problem is first.";
      e.target.disabled = true;
      const r = await Session.api("/api/reports", { json: { kind, target, reason, details: body.querySelector("#kx-details").value.trim() } });
      e.target.disabled = false;
      if (!r.ok) return body.querySelector("#kx-err").textContent = Session.detail(r.data);
      body.innerHTML = `<span class="kx-tag">REPORT SENT</span><h2>Thank you.</h2><p>We've got it, and we'll take a look soon. Thanks for helping keep Mosaic a nice place to make things.</p>
        <div class="kx-row"><button class="kx-btn" type="button" data-close>Done</button></div>`;
      stage.querySelector(".kx-say")?.remove();
    };
  }

  // ---------------------------------------------------------------- confetti popups: a new plan, a claimed ticket, a ticket waiting
  function celebrate(u, c) {
    const plan = PLAN[c.plan] || PLAN.artisan;
    const { body, stage, close, back } = sheet({ b: plan.b, tf: plan.tf, c: plan.c, sky: plan.sky, floor: plan.floor });
    stage.style.height = "180px";
    actor(stage, plan.mascot, c.kind === "gift" ? ["A gift, just for you!", `Welcome to ${plan.name}!`, "Let's make something!"]
                                                : [`Welcome to ${plan.name}!`, "Yay! You're here!", "Let's make something!"], { P: 5 });
    const ends = c.ends ? new Date(c.ends * 1000).toLocaleDateString([], { day: "numeric", month: "long" }) : null;
    body.innerHTML = `<span class="kx-tag">${c.kind === "gift" ? "TICKET CLAIMED" : "WELCOME"}</span>
      <h2>You're on ${plan.name}!</h2>
      <div class="kx-who"><img src="${pfp({ username: u.username, avatar: u.profile?.avatar })}" alt=""><div><b>${esc(u.profile?.display_name || u.username)}</b>
        <span>@${esc(u.username)} &middot; ${plan.name}${c.kind === "gift" ? ` until ${esc(ends)}, a gift from @${esc(c.from)}` : ""}</span></div></div>
      <p>${c.kind === "gift" ? `@${esc(c.from)} gave you a week of ${plan.name}. Everything below is yours until ${esc(ends)}, and what you make keeps its ${plan.name} license for good.`
                             : `Thank you for joining! Here's what just switched on for you:`}</p>
      <ul class="kx-perks">${plan.perks.filter(p => c.kind !== "gift" || !p.startsWith("Gift")).map(p => `<li>${esc(p)}</li>`).join("")}</ul>
      <div class="kx-row"><a class="kx-btn" href="${root}studio/">Open my Studio</a><button class="kx-btn ghost" type="button" data-close>Later</button></div>`;
    confetti([plan.c, "#ffffff", plan.b, "#f87898", "#6ee07a"]);
    Session.api("/api/celebrate/seen", { json: { key: c.key } });
    return new Promise(res => back.addEventListener("closed", res));
  }
  function ticketWaiting(u) {
    const { body, stage } = sheet({ b: "#5a2a44", tf: "#fff", c: "#f87898", sky: "linear-gradient(#1f1830 0 18%, #2c1d3c 18% 34%, #46243f 34% 50%, #6e2d44 50% 64%, #a8433f 64% 78%, #d8663e 78%)",
                                    floor: "linear-gradient(#5cc04a 0 4px, #3c9a3a 4px 8px, #6b4a2c 8px)" });
    actor(stage, "cat", ["Psst... mail for you!", "It's a ticket!", "Go on, open it!"], { P: 4 });
    body.innerHTML = `<span class="kx-tag">YOU'VE GOT MAIL</span><h2>You have a ticket to claim!</h2>
      <p>Someone sent you ${u.tickets > 1 ? "tickets" : "a ticket"} for a week of a Mosaic plan. Open the envelope to see what's inside.</p>
      <div class="kx-row"><a class="kx-btn" href="${root}claim-my-ticket/">Claim my ticket</a><button class="kx-btn ghost" type="button" data-close>Later</button></div>`;
    confetti();
  }
  async function popups() {
    if (!Session.current() || /claim-my-ticket|\/login\//.test(location.pathname)) return;
    const u = await whoami();
    if (!u) return;
    for (const c of u.celebrate || []) await celebrate(u, c);
    let nagged = false;
    try { nagged = sessionStorage.getItem("mosaic-ticket-seen") === String(u.tickets); } catch (_) {}
    if (u.tickets > 0 && !nagged) {
      ticketWaiting(u);
      try { sessionStorage.setItem("mosaic-ticket-seen", String(u.tickets)); } catch (_) {}
    }
  }
  if (document.readyState === "loading") addEventListener("DOMContentLoaded", () => setTimeout(popups, 500));
  else setTimeout(popups, 500);

  return { root, reduce, rand, pick, nav, avatar, pfp, tags, whoami, critter, talk, hop, burst, toast, esc, ago, json,
           dialog, confirm: confirmBox, alert: alertBox, profileMenu, gift, report, confetti, celebrate, PLAN };
})();
