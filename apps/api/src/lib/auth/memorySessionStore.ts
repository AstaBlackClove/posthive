import type { SessionStore } from "./sessionService.js";
import type { SessionRecord } from "./sessionPolicy.js";

/** In-memory SessionStore for tests. */
export function createMemorySessionStore(): SessionStore {
  const rows = new Map<string, SessionRecord>();
  let seq = 0;

  return {
    async create(data) {
      const row: SessionRecord = { ...data, id: `sess-${++seq}`, createdAt: data.lastActiveAt };
      rows.set(row.id, row);
      return { ...row };
    },
    async findById(id) {
      const r = rows.get(id);
      return r ? { ...r } : null;
    },
    async findByAnyTokenHash(hash) {
      for (const r of rows.values()) {
        if (r.tokenHash === hash || r.prevTokenHash === hash) return { ...r };
      }
      return null;
    },
    async update(id, patch) {
      const r = rows.get(id);
      if (r) rows.set(id, { ...r, ...patch });
    },
    async delete(id) {
      rows.delete(id);
    },
    async deleteAllForUser(userId, exceptId) {
      for (const [id, r] of rows) {
        if (r.userId === userId && id !== exceptId) rows.delete(id);
      }
    },
  };
}
