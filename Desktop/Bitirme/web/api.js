const API_BASE = "";  // same origin — server serves both API and web

const api = {
  _token() {
    return localStorage.getItem("pisp_token");
  },

  async _request(method, path, body) {
    const headers = { "Content-Type": "application/json" };
    const token = this._token();
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(API_BASE + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { message: text }; }

    if (!res.ok) {
      throw new Error(data.message || data.error || `HTTP ${res.status}`);
    }
    return data;
  },

  get(path) { return this._request("GET", path); },
  post(path, body) { return this._request("POST", path, body); },
  patch(path, body) { return this._request("PATCH", path, body); },
  delete(path) { return this._request("DELETE", path); },
};
