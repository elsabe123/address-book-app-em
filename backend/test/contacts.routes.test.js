import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';

let app;
let dataFile;
let tempDir;

const validPayload = {
  firstName: 'Grace',
  lastName: 'Hopper',
  cellNumber: '+1 555-234-5678',
  email: 'grace@example.com',
  notes: 'Compiler pioneer.',
};

beforeAll(async () => {
  // Isolated temp data file so these tests never touch the real
  // backend/data/contacts.json, and can run repeatedly/in parallel safely.
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'address-book-test-'));
  dataFile = path.join(tempDir, 'contacts.json');
  process.env.CONTACTS_DATA_FILE = dataFile;

  // Dynamic import so app.js reads CONTACTS_DATA_FILE at import time,
  // after we've set it above (a static top-level import would run first).
  ({ default: app } = await import('../src/app.js'));
});

afterAll(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
  delete process.env.CONTACTS_DATA_FILE;
});

beforeEach(async () => {
  // Reset the data file to an empty list before every test for isolation.
  await fs.writeFile(dataFile, '[]', 'utf-8');
});

async function createContact(overrides = {}) {
  const res = await request(app)
    .post('/api/contacts')
    .send({ ...validPayload, ...overrides });
  return res;
}

describe('GET /api/contacts', () => {
  it('returns an empty list when there are no contacts', async () => {
    const res = await request(app).get('/api/contacts');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns all contacts', async () => {
    await createContact();
    await createContact({ firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com' });

    const res = await request(app).get('/api/contacts');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it('sets a CORS header so a cross-origin frontend can call it', async () => {
    const res = await request(app).get('/api/contacts').set('Origin', 'http://localhost:4200');
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBeTruthy();
  });

  describe('?search=', () => {
    beforeEach(async () => {
      await createContact({ firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com' });
      await createContact({ firstName: 'Grace', lastName: 'Hopper', email: 'grace@example.com' });
      await createContact({ firstName: 'Alan', lastName: 'Turing', email: 'alan@turing.dev' });
    });

    it('matches (case-insensitively) a substring of firstName', async () => {
      const res = await request(app).get('/api/contacts').query({ search: 'ADA' });
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].firstName).toBe('Ada');
    });

    it('matches a substring of lastName', async () => {
      const res = await request(app).get('/api/contacts').query({ search: 'hopper' });
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].lastName).toBe('Hopper');
    });

    it('matches a substring of email', async () => {
      const res = await request(app).get('/api/contacts').query({ search: 'turing.dev' });
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].firstName).toBe('Alan');
    });

    it('matches a common substring across multiple contacts', async () => {
      const res = await request(app).get('/api/contacts').query({ search: 'a' });
      // Ada, Grace(?), Alan -> firstName/lastName/email containing "a"
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
    });

    it('returns an empty list when nothing matches', async () => {
      const res = await request(app).get('/api/contacts').query({ search: 'zzz-nomatch' });
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });
});

describe('GET /api/contacts/:id', () => {
  it('returns the matching contact', async () => {
    const created = await createContact();
    const res = await request(app).get(`/api/contacts/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(created.body);
  });

  it('returns 404 with the standard error shape when not found', async () => {
    const res = await request(app).get('/api/contacts/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
    expect(res.body).toHaveProperty('details');
    expect(Array.isArray(res.body.details)).toBe(true);
  });
});

describe('POST /api/contacts', () => {
  it('creates a contact and returns 201 with server-set fields', async () => {
    const res = await createContact();
    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();
    expect(res.body.firstName).toBe('Grace');
    expect(res.body.lastName).toBe('Hopper');
    expect(res.body.notes).toBe('Compiler pioneer.');
    expect(res.body.createdAt).toBeTruthy();
    expect(res.body.updatedAt).toBe(res.body.createdAt);
    expect(() => new Date(res.body.createdAt).toISOString()).not.toThrow();
  });

  it('creates a contact without notes (optional)', async () => {
    const { notes, ...rest } = validPayload;
    const res = await request(app).post('/api/contacts').send(rest);
    expect(res.status).toBe(201);
    expect(res.body.notes).toBe('');
  });

  it('ignores unknown fields and server-controlled fields from the request body', async () => {
    const res = await request(app)
      .post('/api/contacts')
      .send({ ...validPayload, id: 'client-supplied-id', extra: 'ignored' });
    expect(res.status).toBe(201);
    expect(res.body.id).not.toBe('client-supplied-id');
    expect(res.body.extra).toBeUndefined();
  });

  it('returns 400 with field-level details when required fields are missing', async () => {
    const res = await request(app).post('/api/contacts').send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(res.body.details).toEqual(
      expect.arrayContaining([
        'firstName is required',
        'lastName is required',
        'cellNumber is required',
        'email is required',
      ])
    );
  });

  it('returns 400 for an invalid email', async () => {
    const res = await createContact({ email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.details).toContain('email must be a valid email address');
  });

  it('returns 400 for an invalid cell number', async () => {
    const res = await createContact({ cellNumber: 'abc' });
    expect(res.status).toBe(400);
    expect(res.body.details).toContain('cellNumber must be a valid phone number');
  });

  it('returns 400 when notes exceeds 80 characters', async () => {
    const res = await createContact({ notes: 'x'.repeat(81) });
    expect(res.status).toBe(400);
    expect(res.body.details).toContain('notes must be at most 80 characters');
  });

  it('does not persist a contact when validation fails', async () => {
    await createContact({ email: 'bad-email' });
    const res = await request(app).get('/api/contacts');
    expect(res.body).toHaveLength(0);
  });
});

describe('PUT /api/contacts/:id', () => {
  it('updates the provided fields and bumps updatedAt', async () => {
    const created = await createContact();
    await new Promise((resolve) => setTimeout(resolve, 5));

    const res = await request(app)
      .put(`/api/contacts/${created.body.id}`)
      .send({ lastName: 'Hopper-Updated' });

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(created.body.id);
    expect(res.body.lastName).toBe('Hopper-Updated');
    expect(res.body.firstName).toBe('Grace'); // unchanged
    expect(res.body.createdAt).toBe(created.body.createdAt); // unchanged
    expect(res.body.updatedAt).not.toBe(created.body.updatedAt);
  });

  it('supports a full replacement of all editable fields', async () => {
    const created = await createContact();
    const res = await request(app)
      .put(`/api/contacts/${created.body.id}`)
      .send({
        firstName: 'Ada',
        lastName: 'Lovelace',
        cellNumber: '+44 20 7946 0958',
        email: 'ada@example.com',
        notes: 'Updated notes.',
      });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      firstName: 'Ada',
      lastName: 'Lovelace',
      cellNumber: '+44 20 7946 0958',
      email: 'ada@example.com',
      notes: 'Updated notes.',
    });
  });

  it('returns 404 when updating a non-existent contact', async () => {
    const res = await request(app).put('/api/contacts/does-not-exist').send({ firstName: 'X' });
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when an updated field fails validation', async () => {
    const created = await createContact();
    const res = await request(app)
      .put(`/api/contacts/${created.body.id}`)
      .send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.details).toContain('email must be a valid email address');
  });

  it('returns 400 when clearing a required field to empty', async () => {
    const created = await createContact();
    const res = await request(app).put(`/api/contacts/${created.body.id}`).send({ firstName: '' });
    expect(res.status).toBe(400);
    expect(res.body.details).toContain('firstName is required');
  });
});

describe('DELETE /api/contacts/:id', () => {
  it('deletes an existing contact and returns 204', async () => {
    const created = await createContact();
    const res = await request(app).delete(`/api/contacts/${created.body.id}`);
    expect(res.status).toBe(204);
    expect(res.body).toEqual({});
  });

  it('returns 404 for the deleted contact afterwards', async () => {
    const created = await createContact();
    await request(app).delete(`/api/contacts/${created.body.id}`);
    const res = await request(app).get(`/api/contacts/${created.body.id}`);
    expect(res.status).toBe(404);
  });

  it('returns 404 when deleting a non-existent contact', async () => {
    const res = await request(app).delete('/api/contacts/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});

describe('full CRUD lifecycle + persistence', () => {
  it('create -> read -> update -> search -> delete -> 404, and persists to disk', async () => {
    // Create
    const created = await createContact({ firstName: 'Alan', lastName: 'Turing', email: 'alan@turing.dev' });
    expect(created.status).toBe(201);
    const { id } = created.body;

    // Read
    const read = await request(app).get(`/api/contacts/${id}`);
    expect(read.status).toBe(200);

    // Persistence check: re-read the file directly from disk (bypassing the API)
    const onDisk = JSON.parse(await fs.readFile(dataFile, 'utf-8'));
    expect(onDisk).toHaveLength(1);
    expect(onDisk[0]).toEqual(created.body);

    // Update
    const updated = await request(app).put(`/api/contacts/${id}`).send({ notes: 'Codebreaker.' });
    expect(updated.status).toBe(200);
    expect(updated.body.notes).toBe('Codebreaker.');

    const onDiskAfterUpdate = JSON.parse(await fs.readFile(dataFile, 'utf-8'));
    expect(onDiskAfterUpdate[0].notes).toBe('Codebreaker.');

    // Search
    const searched = await request(app).get('/api/contacts').query({ search: 'turing' });
    expect(searched.body.map((c) => c.id)).toContain(id);

    // Delete
    const deleted = await request(app).delete(`/api/contacts/${id}`);
    expect(deleted.status).toBe(204);

    // 404 after delete
    const afterDelete = await request(app).get(`/api/contacts/${id}`);
    expect(afterDelete.status).toBe(404);

    // Persistence check after delete
    const onDiskAfterDelete = JSON.parse(await fs.readFile(dataFile, 'utf-8'));
    expect(onDiskAfterDelete).toHaveLength(0);
  });
});
