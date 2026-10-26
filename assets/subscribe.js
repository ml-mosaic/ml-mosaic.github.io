// The subscribe popup, on every page that sells a plan: the cat at the cash register, what happens next, and the way
// to Patreon. Any element with data-subscribe="artisan|atelier" (and data-mode="join|upgrade|downgrade|cancel") opens it.
// Subscribe.ctas(user) turns the plan buttons (data-cta="free|artisan|atelier") into the right action for the
// signed-in user's plan: Upgrade, Downgrade, Cancel on Patreon...
// Needs session.js and kit.js (for the cat); brings its own styles, so it also works on the front page.
window.Subscribe = (() => {
  const MANAGE = "https://www.patreon.com/settings/memberships";
  const CHECKOUT = {
    artisan: "https://www.patreon.com/checkout/Mosaic_ML?rid=29914408&vanity=17024707&is_free_trial=true",
    artisan_change: "https://www.patreon.com/checkout/Mosaic_ML?rid=29914408&vanity=17024707",   // members switching tier: no trial
    atelier: "https://www.patreon.com/checkout/Mosaic_ML?rid=29914428&vanity=17024707",
  };
  const TIERS = {
    artisan: { name: "Artisan", price: "S$5 / month", tb: "#6b3a1c", tf: "#fff", c: "#e8913a", perks: "badge, 250 sprites a day and pro Studio" },
    atelier: { name: "Atelier", price: "S$15 / month", tb: "#2c3c74", tf: "#fce060", c: "#fce060", perks: "badge, v1, 500 sprites + 50 clips a day and pro Studio" },
  };
  const root = window.Kit?.root ?? "";
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const css = `
  .sub-back { position: fixed; inset: 0; z-index: 80; background: rgba(0,0,0,.82); display: grid; place-items: center; padding: 18px; overflow-y: auto;
              font-family: "Tiny5", ui-monospace, monospace; -webkit-font-smoothing: none; animation: sub-in .16s steps(3); }
  @keyframes sub-in { from { opacity: 0; transform: translateY(8px); } }
  .sub-card { position: relative; width: min(640px, 100%); background: #120f17; color: #e8e4f0; padding: 0 0 22px;
              box-shadow: 0 -4px 0 0 var(--sub-b), 0 4px 0 0 var(--sub-b), -4px 0 0 0 var(--sub-b), 4px 0 0 0 var(--sub-b); }
  .sub-x { position: absolute; top: 8px; right: 10px; z-index: 5; background: rgba(0,0,0,.5); border: 0; color: #fff; font: inherit; font-size: 20px;
           width: 34px; height: 34px; cursor: pointer; }
  .sub-stage { position: relative; height: 180px; overflow: hidden; image-rendering: pixelated;
               background: linear-gradient(#1f1830 0 18%, #2c1d3c 18% 34%, #46243f 34% 50%, #6e2d44 50% 64%, #a8433f 64% 78%, #d8663e 78%); }
  .sub-stage.cancel { background: linear-gradient(#0c0c2c 0 22%, #141c44 22% 44%, #1c2c5c 44% 66%, #2c3c74 66%); }
  .sub-stage::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 26px; z-index: 1;
                      background: linear-gradient(#5cc04a 0 4px, #3c9a3a 4px 8px, #6b4a2c 8px); }
  .sub-reg { position: absolute; right: 20%; bottom: 22px; width: 120px; height: 90px; z-index: 2; cursor: pointer;
             background: url(${root}assets/scenes/register.png) 0 0 / 200% 100% no-repeat; image-rendering: pixelated; }
  .sub-reg.open { background-position: 100% 0; }
  .sub-coin { position: absolute; width: 25px; height: 25px; z-index: 3; background: url(${root}assets/scenes/coin.png) 0 0 / 100% 100%;
              image-rendering: pixelated; pointer-events: none; }
  .sub-body { padding: 22px 26px 0; }
  .sub-tag { display: inline-block; font-size: 12px; letter-spacing: 2px; padding: 4px 9px; background: var(--sub-b); color: var(--sub-f); }
  .sub-body h2 { font-weight: normal; font-size: clamp(26px, 5vw, 38px); margin: 12px 0 4px; line-height: 1.05; color: #fff; }
  .sub-price { color: #8f86a0; margin: 0 0 18px; font-size: 15px; }
  .sub-steps { list-style: none; margin: 0 0 16px; padding: 0; counter-reset: s; }
  .sub-steps li { counter-increment: s; display: flex; gap: 12px; margin-bottom: 12px; color: #d8d2c4; line-height: 1.5; font-size: 15px; }
  .sub-steps li::before { content: counter(s); flex: none; width: 24px; height: 24px; display: grid; place-items: center; background: var(--sub-b); color: var(--sub-f); }
  .sub-steps b { color: #fff; font-weight: normal; } .sub-steps a { color: #fff; }
  .sub-email { background: #1d1826; padding: 10px 14px; margin: 0 0 18px 36px; color: #b9b0c8; font-size: 13px; line-height: 1.5; }
  .sub-email b { color: #fce060; font-weight: normal; }
  .sub-row { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
  .sub-btn { display: inline-block; text-decoration: none; border: 0; cursor: pointer; padding: 12px 20px; font: inherit; font-size: 16px; letter-spacing: 1px;
             background: var(--sub-c); color: #000; box-shadow: inset 0 -4px 0 0 rgba(0,0,0,.3); }
  .sub-btn:hover { filter: brightness(1.1); }
  .sub-btn.ghost { background: transparent; color: #fff; box-shadow: inset 0 0 0 3px #3a3446; }
  .sub-note { color: #8f86a0; font-size: 12px; margin: 14px 0 0; line-height: 1.5; } .sub-note a { color: #e8e4f0; }
  @media (max-width: 560px) { .sub-reg { right: 8%; } .sub-body { padding: 20px 16px 0; } }`;
  document.head.appendChild(Object.assign(document.createElement("style"), { textContent: css }));

  // who's here, and whether Patreon linking is switched on (asked once per page)
  let infoP = null;
  const info = () => infoP || (infoP = Promise.all([
    Session.current() ? (window.Kit?.whoami ? Kit.whoami() : Session.api("/api/me").then(r => r.ok ? r.data : null)) : Promise.resolve(null),
    Session.api("/api/health", { auth: false }).then(r => r.data?.patreon_auto ? "auto" : !!r.data?.patreon).catch(() => false),
  ]));

  function content(tier, mode, u, linking) {
    const t0 = TIERS[tier] || TIERS.artisan, planName = TIERS[u?.plan]?.name || t0.name;
    const t = { ...t0, price: window.Prices ? `${Prices.label(tier)} / month` : t0.price };   // in the visitor's currency
    const email = u?.email ? `<b>${esc(u.email)}</b>` : "the email you use on Mosaic";
    const check = linking === "auto" ? "it switches over by itself in about a minute"
                : linking ? `press <b>Check again</b> in your <a href="${root}settings/#patreon">settings</a>, or it updates by itself within a few hours`
                : `it switches over once we've matched your email`;
    const M = {
      join: { title: tier === "artisan" ? "Start your Artisan trial" : "Join Atelier", price: tier === "artisan" ? `${t.price}, free trial first` : t.price,
              go: tier === "artisan" ? "Start the free trial on Patreon" : "Join Atelier on Patreon", url: CHECKOUT[tier], coins: true, say: "ka-ching!",
              steps: [tier === "artisan" ? "Subscribe on <b>Patreon</b>: the trial is free, and you can cancel there before it ends." : "Subscribe on <b>Patreon</b>, which handles the billing.",
                      linking === "auto" ? `Use the <b>same email</b> on Patreon as on Mosaic (${email}): your plan switches on <b>by itself</b> in about a minute. Different email? Press <b>Link Patreon</b> in your <a href="${root}settings/#patreon">settings</a>.`
                      : linking ? `Come back and press <b>Link Patreon</b> in your <a href="${root}settings/#patreon">settings</a>: your plan switches on right away.`
                              : "Use the <b>same email</b> on Patreon as on Mosaic, and we'll switch your plan on.",
                      `That's it: your <b>${t.name}</b> ${t.perks} show up in the Studio.`],
              email: linking !== "auto" },
      upgrade: { title: `Upgrade to ${t.name}`, price: t.price, go: `Upgrade on Patreon`, url: CHECKOUT[tier], coins: true, say: "ka-ching!",
                 steps: [`On <b>Patreon</b>, switch your membership to <b>${t.name}</b>.`, `Then ${check}.`,
                         `Your <b>${t.name}</b> ${t.perks} switch on in the Studio.`], email: !linking },
      downgrade: { title: `Switch to ${t.name}`, price: t.price, go: "Change tier on Patreon", url: CHECKOUT[`${tier}_change`] || CHECKOUT[tier], coins: false, say: "okie!",
                   steps: [`On <b>Patreon</b>, change your membership to <b>${t.name}</b>.`,
                           "Patreon decides when the change kicks in (usually your next billing date); your plan follows within a minute.",
                           "Everything you've made keeps its commercial license."], email: !linking },
      cancel: { title: `Cancel ${planName}`, price: "We'll miss you!", go: "Cancel on Patreon", url: MANAGE, coins: false, say: "bye for now!", ghost: true,
                steps: [`Cancel your membership on <b>Patreon</b> (Settings, then Memberships).`,
                        `You keep <b>${planName}</b> until the end of the period you've paid for, then you're back on Free (within a minute of Patreon ending it).`,
                        "Everything you made on a paid plan keeps its commercial license, for good."], email: false },
    };
    return { t, m: M[mode] || M.join, email };
  }

  let closeCurrent = null;
  async function open(tier, mode = "join") {
    if (closeCurrent) closeCurrent();
    if (window.Prices) await Prices.ready;
    const [u, linking] = await info();
    const { t, m, email } = content(tier, mode, u, linking);
    const tb = mode === "cancel" ? "#3a3446" : t.tb, tf = mode === "cancel" ? "#e8e4f0" : t.tf;
    const back = document.createElement("div");
    back.className = "sub-back"; back.setAttribute("role", "dialog"); back.setAttribute("aria-modal", "true"); back.setAttribute("aria-label", m.title);
    back.innerHTML = `<div class="sub-card" style="--sub-b:${tb};--sub-f:${tf};--sub-c:${mode === "cancel" ? "#ff5a4e" : t.c}">
      <button class="sub-x" type="button" aria-label="Close">&times;</button>
      <div class="sub-stage ${mode === "cancel" ? "cancel" : ""}"><div class="sub-reg" title="ka-ching!"></div></div>
      <div class="sub-body"><span class="sub-tag">${(mode === "cancel" ? planName(u, t) : t.name).toUpperCase()}</span>
        <h2>${esc(m.title)}</h2><p class="sub-price">${esc(m.price)}</p>
        <ol class="sub-steps">${m.steps.map(s => `<li><span>${s}</span></li>`).join("")}</ol>
        ${m.email ? `<div class="sub-email">${linking && mode === "join" ? "No time to link? " : ""}Use the same email on Patreon as your Mosaic account (${email}) so we can match the two.</div>` : ""}
        <div class="sub-row"><a class="sub-btn" href="${m.url}" target="_blank" rel="noopener">${esc(m.go)}</a>
          <button class="sub-btn ghost" type="button" data-close>${mode === "cancel" ? "Keep my plan" : "Not now"}</button></div>
        <p class="sub-note">${linking === "auto" && mode !== "cancel" ? `&#x23F3; After Patreon, it takes about a minute for your plan to update here.<br>` : ""}${u ? `Signed in as @${esc(u.username)}.` : `No Mosaic account yet? <a href="${root}login/#signup">Make one first</a>: it's free, and it's what your plan switches on.`}
          Patreon opens in a new tab.</p></div></div>`;
    document.body.appendChild(back);
    const prev = document.activeElement, timers = [];
    const close = () => { timers.forEach(clearInterval); back.remove(); removeEventListener("keydown", key); closeCurrent = null; prev?.focus?.(); };
    const key = e => { if (e.key === "Escape") close(); };
    addEventListener("keydown", key); closeCurrent = close;
    back.addEventListener("click", e => { if (e.target === back || e.target.closest(".sub-x,[data-close]")) close(); });
    back.querySelector(".sub-btn").focus();

    // the cat at the register: ka-ching for joining and upgrading, a goodbye for cancelling
    const stage = back.querySelector(".sub-stage"), reg = back.querySelector(".sub-reg"), reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!window.Kit) return;
    Kit.json(`${root}assets/scenes/scenes.json`).then(list => {
      if (!back.isConnected) return;
      const cat = list.find(s => s.animal.name === "cat")?.animal;
      const c = cat && Kit.critter(cat, stage, { left: "16%", bottom: "22px", P: 4 });
      if (c) c.el.style.zIndex = 2;
      let n = 0;
      const ring = () => {
        n++;
        if (m.coins) {
          reg.classList.add("open"); setTimeout(() => reg.classList.remove("open"), 700);
          const coin = document.createElement("div"); coin.className = "sub-coin";
          const r = reg.getBoundingClientRect(), s = stage.getBoundingClientRect();
          coin.style.left = r.left - s.left + 20 + "px"; coin.style.top = r.top - s.top + 58 + "px"; stage.appendChild(coin);
          if (reduce) coin.remove();
          else coin.animate([{ transform: "translate(0,0)" }, { transform: "translate(-34px,-76px)", offset: .5 }, { transform: "translate(-70px,-16px)", opacity: 0 }],
                            { duration: 900, easing: "steps(9)" }).onfinish = () => coin.remove();
        }
        if (c && n % 2) Kit.hop(c.el);
        if (n % 3 === 1) Kit.talk(m.coins ? reg : c?.el || reg, m.say, 1200);
      };
      reg.addEventListener("click", ring);
      timers.push(setTimeout(ring, 500));
      if (!reduce) timers.push(setInterval(ring, 2600));
    });
  }
  const planName = (u, t) => TIERS[u?.plan]?.name || t.name;

  // plan buttons that know your plan
  async function ctas() {
    const [u] = await info();
    const plan = u?.plan || "free", viaPatreon = u?.plan_source === "patreon", rank = { free: 0, artisan: 1, atelier: 2 };
    document.querySelectorAll("[data-cta]").forEach(el => {
      const tier = el.dataset.cta;
      const set = (text, attrs = {}) => {
        el.textContent = text;
        for (const k of ["data-subscribe", "data-mode", "aria-disabled"]) el.removeAttribute(k);
        for (const [k, v] of Object.entries(attrs)) v === null ? el.removeAttribute(k) : el.setAttribute(k, v);
      };
      if (!u) return;                                                    // signed out: the buttons as written
      if (tier === "free") return set("Open the Studio", { href: `${root}studio/` });
      if (tier === plan) return viaPatreon ? set("Cancel on Patreon", { "data-subscribe": tier, "data-mode": "cancel" })
                                           : set("Your plan", { "aria-disabled": "true", href: null });
      if (rank[tier] > rank[plan]) return set(plan === "free" ? (tier === "artisan" ? "Start free trial" : "Join Atelier") : "Upgrade",
                                              { "data-subscribe": tier, "data-mode": plan === "free" || !viaPatreon ? "join" : "upgrade" });
      return viaPatreon ? set("Downgrade", { "data-subscribe": tier, "data-mode": "downgrade" })
                        : set("Included in your plan", { "aria-disabled": "true", href: null });
    });
  }

  document.addEventListener("click", e => {
    const b = e.target.closest("[data-subscribe]");
    if (!b) return;
    e.preventDefault();
    open(b.dataset.subscribe, b.dataset.mode || "join");
  });
  return { open, ctas, CHECKOUT, MANAGE };
})();
