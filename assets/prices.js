/* Copyright (c) 2026 Mosaic. All rights reserved. Source-available under the Mosaic Source-Available License
   (LICENSE.md): viewing only; no copying, reuse or redistribution of this code or its design. */
// Plan prices in the visitor's own currency. The plans are priced in BASE on Patreon (which charges each patron in
// their own currency); here every element with data-price="free|artisan|atelier" shows the price converted, as an
// estimate ("≈ US$3.86"), from a free exchange-rate feed remembered for 12 hours. If the rates can't load, BASE shows.
// The visitor's country comes from the backend (/api/geo: their IP, looked up on our server in DB-IP's database, which
// we credit in the price note), else from the browser's language and time zone.
// Add data-price-suffix=" / month" to append text; Prices.label(tier) gives the same string for scripts.
window.Prices = (() => {
  const BASE = "SGD", AMOUNT = { free: 0, artisan: 5, atelier: 15 };
  const RATES_URL = `https://open.er-api.com/v6/latest/${BASE}`, KEY = "mosaic-fx", MAX_AGE = 12 * 3600e3;

  // region -> currency for the places people are likely to visit from (others fall back to BASE)
  const EUR = "AT BE CY DE EE ES FI FR GR HR IE IT LT LU LV MT NL PT SI SK".split(" ");
  const CUR = { US: "USD", GB: "GBP", CA: "CAD", AU: "AUD", NZ: "NZD", SG: "SGD", MY: "MYR", ID: "IDR", TH: "THB", PH: "PHP",
                VN: "VND", HK: "HKD", TW: "TWD", CN: "CNY", JP: "JPY", KR: "KRW", IN: "INR", PK: "PKR", BD: "BDT", AE: "AED",
                SA: "SAR", IL: "ILS", TR: "TRY", ZA: "ZAR", NG: "NGN", EG: "EGP", BR: "BRL", MX: "MXN", AR: "ARS", CL: "CLP",
                CO: "COP", PE: "PEN", CH: "CHF", SE: "SEK", NO: "NOK", DK: "DKK", PL: "PLN", CZ: "CZK", HU: "HUF", RO: "RON",
                UA: "UAH", RU: "RUB", IS: "ISK" };
  EUR.forEach(r => CUR[r] = "EUR");
  const TZ = { "Asia/Singapore": "SG", "Asia/Kuala_Lumpur": "MY", "Asia/Jakarta": "ID", "Asia/Bangkok": "TH", "Asia/Manila": "PH",
               "Asia/Ho_Chi_Minh": "VN", "Asia/Hong_Kong": "HK", "Asia/Taipei": "TW", "Asia/Shanghai": "CN", "Asia/Tokyo": "JP",
               "Asia/Seoul": "KR", "Asia/Kolkata": "IN", "Asia/Calcutta": "IN", "Asia/Dubai": "AE", "Europe/London": "GB",
               "Australia/Sydney": "AU", "Australia/Melbourne": "AU", "Pacific/Auckland": "NZ", "America/Toronto": "CA",
               "America/Vancouver": "CA", "America/Sao_Paulo": "BR", "America/Mexico_City": "MX" };

  // the country from the visitor's IP (asked once per tab, so switching a VPN on and opening a new tab shows the change)
  async function ipRegion() {
    try {
      const saved = sessionStorage.getItem("mosaic-country");
      if (saved != null) return saved || null;
    } catch (_) {}
    if (!window.MOSAIC || !MOSAIC.backend) return null;
    try {
      const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 2500);
      const d = await fetch(`${MOSAIC.backend}/api/geo`, { signal: ctl.signal }).then(r => r.json()).finally(() => clearTimeout(timer));
      const c = typeof d.country === "string" ? d.country.toUpperCase() : "";
      try { sessionStorage.setItem("mosaic-country", c); } catch (_) {}
      return c || null;
    } catch (_) { return null; }
  }

  function guessRegion() {
    for (const lang of navigator.languages || [navigator.language]) {
      const m = /[-_]([A-Z]{2})\b/i.exec(lang || "");
      if (m && CUR[m[1].toUpperCase()]) return m[1].toUpperCase();
    }
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      if (TZ[tz]) return TZ[tz];
      if (tz.startsWith("America/")) return "US";
      if (tz.startsWith("Europe/")) return "DE";               // a euro default for the rest of Europe
    } catch (_) {}
    return null;
  }
  let fromIp = false;
  async function currency() {
    const ip = await ipRegion();
    if (ip) { fromIp = true; return CUR[ip] || BASE; }        // a country we have no currency for: show BASE
    return CUR[guessRegion()] || BASE;
  }

  function format(amount, cur) {
    if (cur === "SGD") return `S$${amount.toLocaleString("en", { maximumFractionDigits: amount % 1 ? 2 : 0 })}`;
    const whole = amount === 0 || amount >= 100 || ["JPY", "KRW", "IDR", "VND", "CLP", "COP", "HUF", "ISK", "NGN", "PKR"].includes(cur);
    return new Intl.NumberFormat(undefined, { style: "currency", currency: cur, currencyDisplay: "symbol",
                                             maximumFractionDigits: whole ? 0 : 2, minimumFractionDigits: whole ? 0 : 2 }).format(amount);
  }

  let ratesP = null;
  function rates() {
    if (ratesP) return ratesP;
    try {
      const c = JSON.parse(localStorage.getItem(KEY) || "null");
      if (c && c.base === BASE && Date.now() - c.at < MAX_AGE) return ratesP = Promise.resolve(c.rates);
    } catch (_) {}
    return ratesP = fetch(RATES_URL).then(r => r.json()).then(d => {
      if (d.result !== "success" || !d.rates) throw new Error("no rates");
      try { localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), base: BASE, rates: d.rates })); } catch (_) {}
      return d.rates;
    }).catch(() => null);
  }

  let state = { cur: BASE, rate: 1 };                          // until the rates arrive: the base price
  const label = tier => {
    const base = AMOUNT[tier];
    if (base == null) return "";
    if (state.cur === BASE || base === 0) return format(base * state.rate, state.cur);
    return "≈ " + format(base * state.rate, state.cur);
  };
  const credit = () => fromIp ? ` Your country is looked up by <a href="https://db-ip.com" rel="noopener">DB-IP</a>.` : "";
  const note = () => (state.cur === BASE ? `Prices in ${BASE}.`
    : `Prices are set in ${BASE} (S$5 and S$15 a month); shown here in ${state.cur} as an estimate. Patreon charges you in your own currency.`) + credit();

  function apply(root = document) {
    root.querySelectorAll("[data-price]").forEach(el => {
      el.textContent = label(el.dataset.price) + (el.dataset.priceSuffix || "");
      el.title = state.cur === BASE ? "" : `${format(AMOUNT[el.dataset.price], BASE)} a month, about ${label(el.dataset.price).replace("≈ ", "")} in ${state.cur}`;
    });
    root.querySelectorAll("[data-price-note]").forEach(el => el.innerHTML = note());
  }

  const ready = (async () => {
    const cur = await currency();
    if (cur !== BASE) {
      const r = await rates();
      if (r && r[cur]) state = { cur, rate: r[cur] };
    }
    if (document.readyState === "loading") await new Promise(res => document.addEventListener("DOMContentLoaded", res));
    apply();
    return state;
  })();

  return { ready, label, apply, note, BASE, AMOUNT };
})();
