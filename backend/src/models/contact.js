/**
 * Contact validation rules — single source of truth for the limits/regexes
 * described in docs/SDD/1-address-book-crud.spec.md §3.
 */

export const LIMITS = Object.freeze({
  firstName: 50,
  lastName: 50,
  notes: 80,
});

export const PATTERNS = Object.freeze({
  cellNumber: /^\+?[0-9\s\-()]{7,20}$/,
  // Standard/RFC-5322-lite email pattern (same shape as the HTML5 <input type="email"> spec).
  email:
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/,
});

const KNOWN_FIELDS = ['firstName', 'lastName', 'cellNumber', 'email', 'notes'];

function has(input, field) {
  return Object.prototype.hasOwnProperty.call(input, field);
}

/**
 * Validates a contact payload.
 *
 * @param {object} input raw request body (may contain unknown/extra fields;
 *   those are always ignored and never appear in the returned `data`).
 * @param {{partial?: boolean}} options `partial: true` (used for PUT) skips
 *   the "required" check for fields that are entirely absent from `input`,
 *   but any field that IS present is still fully validated.
 * @returns {{valid: boolean, errors: string[], data: object}} `data` contains
 *   only the known, validated fields that were present in `input`.
 */
export function validateContact(input, { partial = false } = {}) {
  const body = input && typeof input === 'object' ? input : {};
  const errors = [];
  const data = {};

  // --- firstName / lastName -------------------------------------------------
  for (const field of ['firstName', 'lastName']) {
    if (!has(body, field)) {
      if (!partial) errors.push(`${field} is required`);
      continue;
    }
    const value = body[field];
    if (typeof value !== 'string') {
      errors.push(`${field} must be a string`);
      continue;
    }
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      errors.push(`${field} is required`);
      continue;
    }
    if (trimmed.length > LIMITS[field]) {
      errors.push(`${field} must be at most ${LIMITS[field]} characters`);
      continue;
    }
    data[field] = trimmed;
  }

  // --- cellNumber -------------------------------------------------------------
  if (!has(body, 'cellNumber')) {
    if (!partial) errors.push('cellNumber is required');
  } else {
    const value = body.cellNumber;
    if (typeof value !== 'string' || value.trim().length === 0) {
      errors.push('cellNumber is required');
    } else if (!PATTERNS.cellNumber.test(value)) {
      errors.push('cellNumber must be a valid phone number');
    } else {
      data.cellNumber = value;
    }
  }

  // --- email -------------------------------------------------------------------
  if (!has(body, 'email')) {
    if (!partial) errors.push('email is required');
  } else {
    const value = body.email;
    if (typeof value !== 'string' || value.trim().length === 0) {
      errors.push('email is required');
    } else if (!PATTERNS.email.test(value)) {
      errors.push('email must be a valid email address');
    } else {
      data.email = value;
    }
  }

  // --- notes (optional) --------------------------------------------------------
  if (has(body, 'notes')) {
    const value = body.notes;
    if (value === null || value === undefined) {
      data.notes = '';
    } else if (typeof value !== 'string') {
      errors.push('notes must be a string');
    } else if (value.length > LIMITS.notes) {
      errors.push(`notes must be at most ${LIMITS.notes} characters`);
    } else {
      data.notes = value;
    }
  }

  return { valid: errors.length === 0, errors, data };
}

export { KNOWN_FIELDS };
