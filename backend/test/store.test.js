import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { createStore } from '../src/data/store.js';

/**
 * Proves the claims in store.js's docblock: the write-queue mutex genuinely
 * serializes concurrent read-modify-write cycles (no lost updates), and the
 * atomic temp-file+rename write never leaves the target file partially
 * written, even under a burst of concurrent writers.
 */
describe('createStore concurrency', () => {
  let tempDir;
  let dataFile;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'address-book-store-test-'));
    dataFile = path.join(tempDir, 'contacts.json');
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('persists every record from concurrent create() calls with no lost updates', async () => {
    const store = createStore(dataFile);
    const CONCURRENCY = 25;

    // Fire all creates "simultaneously" (no awaiting between them) — without
    // the mutex, each would read the same initial state and clobber the
    // others' writes on the way out.
    await Promise.all(
      Array.from({ length: CONCURRENCY }, (_, i) => store.create({ id: `id-${i}`, seq: i }))
    );

    const all = await store.getAll();
    expect(all).toHaveLength(CONCURRENCY);
    const ids = new Set(all.map((c) => c.id));
    expect(ids.size).toBe(CONCURRENCY);

    // File on disk must be valid, complete JSON — never a partial write.
    const raw = await fs.readFile(dataFile, 'utf-8');
    expect(() => JSON.parse(raw)).not.toThrow();
    expect(JSON.parse(raw)).toHaveLength(CONCURRENCY);
  });

  it('applies every update in a burst of concurrent update() calls to distinct records', async () => {
    const store = createStore(dataFile);
    const RECORD_COUNT = 10;

    await Promise.all(
      Array.from({ length: RECORD_COUNT }, (_, i) => store.create({ id: `id-${i}`, hit: false }))
    );

    await Promise.all(
      Array.from({ length: RECORD_COUNT }, (_, i) =>
        store.update(`id-${i}`, (contact) => ({ ...contact, hit: true }))
      )
    );

    const all = await store.getAll();
    expect(all).toHaveLength(RECORD_COUNT);
    expect(all.every((c) => c.hit === true)).toBe(true);
  });

  it('interleaves concurrent create/update/remove without corrupting the file', async () => {
    const store = createStore(dataFile);
    await store.create({ id: 'keep-1' });
    await store.create({ id: 'remove-me' });

    await Promise.all([
      store.create({ id: 'new-1' }),
      store.create({ id: 'new-2' }),
      store.update('keep-1', (c) => ({ ...c, touched: true })),
      store.remove('remove-me'),
    ]);

    const all = await store.getAll();
    const ids = all.map((c) => c.id).sort();
    expect(ids).toEqual(['keep-1', 'new-1', 'new-2'].sort());
    expect(all.find((c) => c.id === 'keep-1').touched).toBe(true);
  });
});
