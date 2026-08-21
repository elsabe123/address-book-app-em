import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Creates a JSON-file-backed contact store.
 *
 * - Reads always re-read from disk (single-user assumption, simple and
 *   always fresh).
 * - Writes go through an in-process mutex (a chained promise queue) so
 *   concurrent requests never interleave read-modify-write cycles.
 * - Writes are atomic: content is written to a temp file in the same
 *   directory, then renamed over the target file, so a crash mid-write
 *   cannot leave a corrupt/partial contacts.json.
 *
 * @param {string} filePath absolute path to the JSON data file
 */
export function createStore(filePath) {
  // Promise chain used as a simple async mutex: every write operation is
  // appended to this chain so writes never run concurrently with each other.
  let writeQueue = Promise.resolve();

  async function ensureFile() {
    try {
      await fs.access(filePath);
    } catch {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, '[]', 'utf-8');
    }
  }

  async function readAll() {
    await ensureFile();
    const raw = await fs.readFile(filePath, 'utf-8');
    if (!raw || !raw.trim()) {
      return [];
    }
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      // Corrupt file: fail safe with an empty list rather than throwing,
      // so the API stays available (writes will heal the file).
      return [];
    }
  }

  async function writeAllAtomic(contacts) {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    const tempFile = path.join(
      dir,
      `.${path.basename(filePath)}.${process.pid}.${Date.now()}.${Math.random()
        .toString(36)
        .slice(2)}.tmp`
    );
    await fs.writeFile(tempFile, JSON.stringify(contacts, null, 2), 'utf-8');
    await fs.rename(tempFile, filePath);
  }

  /** Runs fn() exclusively with respect to other calls made via this helper. */
  function withWriteLock(fn) {
    const run = writeQueue.then(fn, fn);
    // Keep the queue alive regardless of success/failure of this task, but
    // never let a rejection here surface anywhere except to this task's caller.
    writeQueue = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }

  return {
    async getAll() {
      return readAll();
    },

    async getById(id) {
      const all = await readAll();
      return all.find((c) => c.id === id) ?? null;
    },

    /** Appends a fully-formed contact object and persists it. */
    async create(contact) {
      return withWriteLock(async () => {
        const all = await readAll();
        all.push(contact);
        await writeAllAtomic(all);
        return contact;
      });
    },

    /**
     * Applies `updater(currentContact) -> nextContact` to the record with
     * the given id and persists the result. Returns null if not found.
     */
    async update(id, updater) {
      return withWriteLock(async () => {
        const all = await readAll();
        const index = all.findIndex((c) => c.id === id);
        if (index === -1) {
          return null;
        }
        const updated = updater(all[index]);
        all[index] = updated;
        await writeAllAtomic(all);
        return updated;
      });
    },

    /** Removes the record with the given id. Returns true if it existed. */
    async remove(id) {
      return withWriteLock(async () => {
        const all = await readAll();
        const index = all.findIndex((c) => c.id === id);
        if (index === -1) {
          return false;
        }
        all.splice(index, 1);
        await writeAllAtomic(all);
        return true;
      });
    },
  };
}
