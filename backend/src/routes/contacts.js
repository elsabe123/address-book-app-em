import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { validateContact } from '../models/contact.js';

const NOT_FOUND_ERROR = { error: 'Contact not found', details: [] };

/**
 * Builds the /api/contacts router bound to a given store instance.
 * @param {ReturnType<import('../data/store.js').createStore>} store
 */
export function createContactsRouter(store) {
  const router = Router();

  // GET /api/contacts?search=<term>
  router.get('/', async (req, res, next) => {
    try {
      const all = await store.getAll();
      const { search } = req.query;
      if (search === undefined || search === '') {
        return res.json(all);
      }
      const term = String(search).toLowerCase();
      const filtered = all.filter((contact) =>
        [contact.firstName, contact.lastName, contact.email].some((field) =>
          String(field ?? '').toLowerCase().includes(term)
        )
      );
      res.json(filtered);
    } catch (err) {
      next(err);
    }
  });

  // GET /api/contacts/:id
  router.get('/:id', async (req, res, next) => {
    try {
      const contact = await store.getById(req.params.id);
      if (!contact) {
        return res.status(404).json(NOT_FOUND_ERROR);
      }
      res.json(contact);
    } catch (err) {
      next(err);
    }
  });

  // POST /api/contacts
  router.post('/', async (req, res, next) => {
    try {
      const { valid, errors, data } = validateContact(req.body, { partial: false });
      if (!valid) {
        return res.status(400).json({ error: 'Validation failed', details: errors });
      }
      const now = new Date().toISOString();
      const contact = {
        id: uuidv4(),
        firstName: data.firstName,
        lastName: data.lastName,
        cellNumber: data.cellNumber,
        email: data.email,
        notes: data.notes ?? '',
        createdAt: now,
        updatedAt: now,
      };
      await store.create(contact);
      res.status(201).json(contact);
    } catch (err) {
      next(err);
    }
  });

  // PUT /api/contacts/:id
  router.put('/:id', async (req, res, next) => {
    try {
      const existing = await store.getById(req.params.id);
      if (!existing) {
        return res.status(404).json(NOT_FOUND_ERROR);
      }
      const { valid, errors, data } = validateContact(req.body, { partial: true });
      if (!valid) {
        return res.status(400).json({ error: 'Validation failed', details: errors });
      }
      const updated = await store.update(req.params.id, (current) => ({
        ...current,
        ...data,
        id: current.id,
        createdAt: current.createdAt,
        updatedAt: new Date().toISOString(),
      }));
      if (!updated) {
        return res.status(404).json(NOT_FOUND_ERROR);
      }
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  // DELETE /api/contacts/:id
  router.delete('/:id', async (req, res, next) => {
    try {
      const removed = await store.remove(req.params.id);
      if (!removed) {
        return res.status(404).json(NOT_FOUND_ERROR);
      }
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

  return router;
}
