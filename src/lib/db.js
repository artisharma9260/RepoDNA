// A tiny compatibility layer that mimics the small subset of the Supabase
// query-builder used across the app (`.from(table).select().eq().order()...`),
// but talks to the new Express + MongoDB backend instead of Supabase/Postgres.
// Row scoping to the signed-in user is enforced server-side, not here.
import { apiClient } from "@/lib/apiClient";
class QueryBuilder {
  table;
  method = "select";
  filters = [];
  body;
  orderCol = null;
  ascending = true;
  limitN = null;
  singleMode = null;
  upsertOnConflict = null;
  wantsSelectBack = false;
  constructor(table) {
    this.table = table;
  }
  select(_cols = "*") {
    if (this.method === "insert" || this.method === "update") this.wantsSelectBack = true;
    return this;
  }
  eq(col, val) {
    this.filters.push([col, val]);
    return this;
  }
  order(col, opts) {
    this.orderCol = col;
    this.ascending = opts?.ascending !== false;
    return this;
  }
  limit(n) {
    this.limitN = n;
    return this;
  }
  insert(payload) {
    this.method = "insert";
    this.body = payload;
    return this;
  }
  update(patch) {
    this.method = "update";
    this.body = patch;
    return this;
  }
  delete() {
    this.method = "delete";
    return this;
  }
  upsert(payload, opts) {
    this.method = "upsert";
    this.body = payload;
    this.upsertOnConflict = opts?.onConflict ?? null;
    return this._exec();
  }
  single() {
    this.singleMode = "single";
    return this._exec();
  }
  maybeSingle() {
    this.singleMode = "maybe";
    return this._exec();
  }
  then(onfulfilled, onrejected) {
    return this._exec().then(onfulfilled, onrejected);
  }
  async _exec() {
    try {
      if (this.method === "select") {
        const params = {};
        if (this.filters.length > 0) params.filters = JSON.stringify(this.filters);
        if (this.orderCol) {
          params.order = this.orderCol;
          params.ascending = String(this.ascending);
        }
        if (this.limitN != null) params.limit = String(this.limitN);
        if (this.singleMode) params.mode = this.singleMode;
        const res = await apiClient.get(`/db/${this.table}`, {
          params
        });
        return {
          data: res.data.data ?? null,
          error: null
        };
      }
      if (this.method === "insert") {
        const res = await apiClient.post(`/db/${this.table}`, this.body);
        return {
          data: res.data.data ?? null,
          error: null
        };
      }
      if (this.method === "update") {
        const params = {};
        if (this.filters.length > 0) params.filters = JSON.stringify(this.filters);
        await apiClient.patch(`/db/${this.table}`, this.body, {
          params
        });
        return {
          data: null,
          error: null
        };
      }
      if (this.method === "delete") {
        const params = {};
        if (this.filters.length > 0) params.filters = JSON.stringify(this.filters);
        await apiClient.delete(`/db/${this.table}`, {
          params
        });
        return {
          data: null,
          error: null
        };
      }
      if (this.method === "upsert") {
        const params = {};
        if (this.upsertOnConflict) params.onConflict = this.upsertOnConflict;
        const res = await apiClient.put(`/db/${this.table}`, this.body, {
          params
        });
        return {
          data: res.data.data ?? null,
          error: null
        };
      }
      return {
        data: null,
        error: null
      };
    } catch (e) {
      const message = e?.response?.data?.error ?? e.message ?? "Request failed";
      return {
        data: null,
        error: new Error(message)
      };
    }
  }
}
export const db = {
  from(table) {
    return new QueryBuilder(table);
  }
};