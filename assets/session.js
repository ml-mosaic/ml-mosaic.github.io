// Sign-in state for the static site. The backend issues a session token at sign-in; it's kept here (localStorage
// with "remember me", else sessionStorage, which ends with the tab) and sent as `Authorization: Bearer ...`.
window.Session = (() => {
  const KEY = "mosaic-session";
  const stores = () => [localStorage, sessionStorage];
  function current() {
    for (const s of stores()) {
      try {
        const v = JSON.parse(s.getItem(KEY));
        if (v && v.expires * 1000 > Date.now()) return v;
      } catch (_) {}
    }
    return null;
  }
  function clear() { for (const s of stores()) try { s.removeItem(KEY); } catch (_) {} }
  function save(data, remember) {
    clear();
    try { (remember ? localStorage : sessionStorage).setItem(KEY, JSON.stringify(
      { session: data.session, username: data.username, expires: data.expires })); } catch (_) {}
  }
  // fetch() against the backend: {ok, status, data (parsed JSON or null), res}
  async function api(path, { method, json, auth = true } = {}) {
    const s = current(), headers = {};
    if (json !== undefined) headers["content-type"] = "application/json";
    if (s && auth) headers.authorization = "Bearer " + s.session;
    let res;
    try {
      res = await fetch(MOSAIC.backend + path, { method: method || (json !== undefined ? "POST" : "GET"), headers,
                                                 body: json !== undefined ? JSON.stringify(json) : undefined });
    } catch (_) {
      return { ok: false, status: 0, data: { detail: "can't reach the m1 server" }, res: null };
    }
    if (res.status === 401 && s && auth) clear();          // expired or revoked: forget it
    const isJson = (res.headers.get("content-type") || "").includes("json");
    return { ok: res.ok, status: res.status, data: isJson ? await res.json().catch(() => ({})) : null, res };
  }
  const detail = d => typeof d?.detail === "string" ? d.detail : d?.detail?.message ||
                      (Array.isArray(d?.detail) ? "check the fields" : "something went wrong");
  async function signOut() { await api("/api/logout", { method: "POST" }); clear(); }
  return { current, save, clear, api, detail, signOut };
})();
