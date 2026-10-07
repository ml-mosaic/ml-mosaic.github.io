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
    const links = [["Home", "", "opt"], ["Studio", "studio/", ""], ["Blog", "blog/", "opt"], ["Dev portal", "portal/", "opt"], ["Status", "status/", "opt"]];
    if (me) links.splice(4, 0, ["Keys", "portal/keys/", "opt"]);
    el.innerHTML = `<div class="wrap">
      <a class="brand" href="${root}" aria-label="Mosaic home"><img src="${root}assets/logo-wordmark.png" alt="Mosaic"></a>
      <div class="links">${links.map(([t, h, c]) => `<a class="${c}" href="${root}${h}"${t === active ? ' aria-current="page"' : ""}>${t}</a>`).join("")}</div>
      <div class="who">${me
        ? `<a class="me" href="${root}settings/" title="Your profile"><img class="avatar" id="kit-avatar" src="${avatar(me.username)}" alt=""><span class="name" id="kit-name">${esc(me.username)}</span></a>
           <button class="btn small ghost" type="button" id="kit-signout">Sign out</button>`
        : `<a class="btn small" href="${root}login/">Sign in</a>`}</div></div>`;
    el.querySelector("#kit-signout")?.addEventListener("click", async () => { await Session.signOut(); location.href = root; });
    if (me) whoami().then(u => {
      if (!u) return;
      el.querySelector("#kit-avatar").src = pfp({ username: u.username, avatar: u.profile.avatar });
      el.querySelector("#kit-name").textContent = u.profile.display_name;
    });
  }
  // the signed-in user (profile + today's allowance), fetched once per page
  let mePromise = null;
  function whoami(refresh = false) {
    if (!Session.current()) return Promise.resolve(null);
    if (!mePromise || refresh) mePromise = Session.api("/api/me").then(r => r.ok ? r.data : null);
    return mePromise;
  }
  // tags next to a person's name ("Developer")
  const tags = person => (person?.badges || []).map(b => `<span class="utag">${esc(b)}</span>`).join("");
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

  return { root, reduce, rand, pick, nav, avatar, pfp, tags, whoami, critter, talk, hop, burst, toast, esc, ago, json,
           dialog, confirm: confirmBox, alert: alertBox };
})();
