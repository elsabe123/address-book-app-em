/**
 * Contact data model.
 *
 * Mirrors the backend `Contact` shape documented in
 * docs/SDD/1-address-book-crud.spec.md §3.
 */
export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  cellNumber: string;
  email: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/** Payload shape accepted by create/update requests (server assigns id + timestamps). */
export type ContactInput = Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>;
