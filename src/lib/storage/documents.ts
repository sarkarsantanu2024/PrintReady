/**
 * Storage adapter for generated-document metadata.
 *
 * Today: localStorage (per the MVP plan).
 * Later: swap the implementation of the four exported methods to call Supabase.
 *        Nothing else in the codebase needs to change.
 */

export type Flow = 'editor' | 'upload' | 'bulk';
export type LayoutKind = 'id_card' | 'business_card' | 'certificate';

export interface SavedDocument {
  id: string;
  user_id: string;
  flow: Flow;
  layout?: LayoutKind;
  title: string;
  data: Record<string, unknown>;
  created_at: string;
}

const KEY = 'printready:documents';

function readAll(): SavedDocument[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedDocument[]) : [];
  } catch {
    return [];
  }
}

function writeAll(docs: SavedDocument[]) {
  window.localStorage.setItem(KEY, JSON.stringify(docs));
}

export const documentStorage = {
  async save(doc: SavedDocument): Promise<SavedDocument> {
    const all = readAll();
    const existing = all.findIndex((d) => d.id === doc.id);
    if (existing >= 0) all[existing] = doc;
    else all.unshift(doc);
    writeAll(all);
    return doc;
  },

  async list(user_id: string): Promise<SavedDocument[]> {
    return readAll()
      .filter((d) => d.user_id === user_id)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  },

  async get(id: string): Promise<SavedDocument | null> {
    return readAll().find((d) => d.id === id) ?? null;
  },

  async delete(id: string): Promise<void> {
    const all = readAll().filter((d) => d.id !== id);
    writeAll(all);
  },
};

/** Generates a short id for client-side records. */
export function newDocumentId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
