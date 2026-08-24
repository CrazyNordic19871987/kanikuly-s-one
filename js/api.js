// ════════════════════════════════════════════
//  КАНИКУЛЫ С ONE! — API СЛОЙ (Supabase REST)
// ════════════════════════════════════════════

class SupabaseAPI {
  constructor() {
    this.base = SUPABASE_URL + '/rest/v1';
    this.h = {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };
  }

  async _req(url, opts) {
    const options = opts || {};
    const headers = {};
    for (const k in this.h) headers[k] = this.h[k];
    if (options.headers) {
      for (const k2 in options.headers) headers[k2] = options.headers[k2];
    }
    const r = await fetch(url, {
      method: options.method || 'GET',
      headers: headers,
      body: options.body
    });
    if (!r.ok) {
      const errBody = await r.text().catch(() => '');
      throw new Error('API ' + r.status + ': ' + errBody.substring(0, 200));
    }
    const text = await r.text();
    return text ? JSON.parse(text) : [];
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
