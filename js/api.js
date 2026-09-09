/* exported api */
// ════════════════════════════════════════════
//  КАНИКУЛЫ С ONE! — API СЛОЙ (Supabase REST)
// ════════════════════════════════════════════

class SupabaseAPI {
  constructor() {
    this.base = SUPABASE_URL + '/rest/v1';
    this._updateHeaders();
    this._retryCount = 1;
    this._retryDelay = 800;
    this._timeoutMs = 15000;
  }

  _updateHeaders() {
    const token = localStorage.getItem('kanikuly_access_token') || SUPABASE_ANON_KEY;
    this.h = {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };
  }

  refreshAuth() {
    this._updateHeaders();
  }

  _isOffline() {
    return typeof navigator !== 'undefined' && navigator.onLine === false;
  }

  _toast(msg, type) {
    if (typeof showToast === 'function') showToast(msg, type || 'error');
  }

  async _req(url, opts, _attempt) {
    const attempt = _attempt || 0;
    if (this._isOffline() && attempt === 0) {
      this._toast('Нет подключения к интернету', 'error');
      throw new Error('OFFLINE');
    }

    const options = opts || {};
    const headers = {};
    for (const k in this.h) headers[k] = this.h[k];
    if (options.headers) {
      for (const k2 in options.headers) headers[k2] = options.headers[k2];
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this._timeoutMs);
    if (options.signal) {
      if (options.signal.aborted) controller.abort();
      else options.signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    let r;
    try {
      r = await fetch(url, {
        method: options.method || 'GET',
        headers: headers,
        body: options.body,
        signal: controller.signal
      });
    } catch (fetchErr) {
      clearTimeout(timer);
      if (fetchErr && fetchErr.name === 'AbortError') {
        if (options.signal && options.signal.aborted) throw fetchErr;
        this._toast('Сервер не отвечает. Попробуйте позже.', 'error');
        throw new Error('TIMEOUT: ' + url);
      }
      if (attempt < this._retryCount) {
        await new Promise(function (res) { setTimeout(res, this._retryDelay * (attempt + 1)); }.bind(this));
        return this._req(url, opts, attempt + 1);
      }
      this._toast('Сеть недоступна. Проверьте подключение.', 'error');
      throw new Error('NETWORK_ERROR: ' + fetchErr.message);
    }
    clearTimeout(timer);

    if (!r.ok) {
      const errBody = await r.text().catch(function () { return ''; });
      const msg = 'API ' + r.status + ': ' + errBody.substring(0, 200);

      if (r.status === 401) {
        this._toast('Сессия истекла. Войдите снова.', 'error');
        throw new Error('AUTH_EXPIRED: ' + msg);
      }
      if (r.status === 429) {
        if (attempt < this._retryCount) {
          await new Promise(function (res) { setTimeout(res, this._retryDelay * (attempt + 1)); }.bind(this));
          return this._req(url, opts, attempt + 1);
        }
        this._toast('Слишком много запросов. Повторите позже.', 'error');
        throw new Error('RATE_LIMITED: ' + msg);
      }
      if (r.status >= 500 && attempt < this._retryCount) {
        await new Promise(function (res) { setTimeout(res, this._retryDelay * (attempt + 1)); }.bind(this));
        return this._req(url, opts, attempt + 1);
      }
      if (r.status >= 500) {
        this._toast('Ошибка сервера. Попробуйте позже.', 'error');
      }
      throw new Error(msg);
    }

    const text = await r.text();
    try {
      return text ? JSON.parse(text) : [];
    } catch {
      this._toast('Некорректный ответ сервера.', 'error');
      throw new Error('PARSE_ERROR: ' + text.substring(0, 200));
    }
  }

  async getAll(table) {
    const PAGE_SIZE = 1000;
    let all = [];
    let offset = 0;
    while (true) {
      const url = this.base + '/' + table + '?select=*&order=created_at.desc&limit=' + PAGE_SIZE + '&offset=' + offset;
      const batch = await this._req(url);
      all = all.concat(batch);
      if (batch.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }
    return all;
  }

  async insert(table, data) {
    return await this._req(this.base + '/' + table, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async update(table, id, data) {
    return await this._req(this.base + '/' + table + '?id=eq.' + id, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  async upsert(table, data) {
    return await this._req(this.base + '/' + table, {
      method: 'POST',
      headers: { 'Prefer': 'return=representation,resolution=merge-duplicates' },
      body: JSON.stringify(data)
    });
  }

  async remove(table, id) {
    return await this._req(this.base + '/' + table + '?id=eq.' + id, {
      method: 'DELETE'
    });
  }

  async removeWhere(table, filter) {
    return await this._req(this.base + '/' + table + '?' + filter, {
      method: 'DELETE'
    });
  }
}

const api = new SupabaseAPI();
