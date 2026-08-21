import { describe, it, expect } from 'vitest';
import { validateContact, LIMITS, PATTERNS } from '../src/models/contact.js';

const validContact = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  cellNumber: '+1 (555) 123-4567',
  email: 'ada@example.com',
  notes: 'Met at a conference.',
};

describe('validateContact', () => {
  it('accepts a fully valid contact', () => {
    const result = validateContact(validContact);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.data).toMatchObject({
      firstName: 'Ada',
      lastName: 'Lovelace',
      cellNumber: '+1 (555) 123-4567',
      email: 'ada@example.com',
      notes: 'Met at a conference.',
    });
  });

  it('accepts a valid contact without notes (optional field)', () => {
    const { notes, ...rest } = validContact;
    const result = validateContact(rest);
    expect(result.valid).toBe(true);
    expect(result.data.notes).toBeUndefined();
  });

  it('ignores unknown/extra fields', () => {
    const result = validateContact({ ...validContact, favoriteColor: 'blue', id: 'hacker-supplied' });
    expect(result.valid).toBe(true);
    expect(result.data.favoriteColor).toBeUndefined();
    expect(result.data.id).toBeUndefined();
  });

  // --- firstName ---------------------------------------------------------
  describe('firstName', () => {
    it('rejects a missing firstName', () => {
      const { firstName, ...rest } = validContact;
      const result = validateContact(rest);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('firstName is required');
    });

    it('rejects an empty/whitespace-only firstName', () => {
      const result = validateContact({ ...validContact, firstName: '   ' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('firstName is required');
    });

    it('rejects a firstName over 50 characters', () => {
      const result = validateContact({ ...validContact, firstName: 'a'.repeat(51) });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('firstName must be at most 50 characters');
    });

    it('accepts a firstName exactly 50 characters', () => {
      const result = validateContact({ ...validContact, firstName: 'a'.repeat(50) });
      expect(result.valid).toBe(true);
    });

    it('trims surrounding whitespace', () => {
      const result = validateContact({ ...validContact, firstName: '  Ada  ' });
      expect(result.valid).toBe(true);
      expect(result.data.firstName).toBe('Ada');
    });
  });

  // --- lastName ------------------------------------------------------------
  describe('lastName', () => {
    it('rejects a missing lastName', () => {
      const { lastName, ...rest } = validContact;
      const result = validateContact(rest);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('lastName is required');
    });

    it('rejects a lastName over 50 characters', () => {
      const result = validateContact({ ...validContact, lastName: 'b'.repeat(51) });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('lastName must be at most 50 characters');
    });

    it('accepts a lastName exactly 50 characters', () => {
      const result = validateContact({ ...validContact, lastName: 'b'.repeat(50) });
      expect(result.valid).toBe(true);
    });
  });

  // --- cellNumber ------------------------------------------------------------
  describe('cellNumber', () => {
    it('rejects a missing cellNumber', () => {
      const { cellNumber, ...rest } = validContact;
      const result = validateContact(rest);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('cellNumber is required');
    });

    it('rejects letters in the cell number', () => {
      const result = validateContact({ ...validContact, cellNumber: 'not-a-number' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('cellNumber must be a valid phone number');
    });

    it('rejects a cell number shorter than 7 characters', () => {
      const result = validateContact({ ...validContact, cellNumber: '12345' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('cellNumber must be a valid phone number');
    });

    it('rejects a cell number longer than 20 characters', () => {
      const result = validateContact({ ...validContact, cellNumber: '1'.repeat(21) });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('cellNumber must be a valid phone number');
    });

    it('accepts plain digits', () => {
      const result = validateContact({ ...validContact, cellNumber: '5551234567' });
      expect(result.valid).toBe(true);
    });

    it('accepts a leading + and punctuation', () => {
      const result = validateContact({ ...validContact, cellNumber: '+27 (082) 555-1234' });
      expect(result.valid).toBe(true);
    });

    it('matches the documented PATTERNS.cellNumber regex directly', () => {
      expect(PATTERNS.cellNumber.test('+1234567')).toBe(true);
      expect(PATTERNS.cellNumber.test('abc')).toBe(false);
    });
  });

  // --- email -------------------------------------------------------------------
  describe('email', () => {
    it('rejects a missing email', () => {
      const { email, ...rest } = validContact;
      const result = validateContact(rest);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('email is required');
    });

    it('rejects an email without an @', () => {
      const result = validateContact({ ...validContact, email: 'not-an-email' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('email must be a valid email address');
    });

    it('rejects an email without a domain', () => {
      const result = validateContact({ ...validContact, email: 'ada@' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('email must be a valid email address');
    });

    it('rejects an email with spaces', () => {
      const result = validateContact({ ...validContact, email: 'ada lovelace@example.com' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('email must be a valid email address');
    });

    it('accepts a standard email address', () => {
      const result = validateContact({ ...validContact, email: 'ada.lovelace+tag@sub.example.co.uk' });
      expect(result.valid).toBe(true);
    });
  });

  // --- notes (optional, max 80) --------------------------------------------
  describe('notes', () => {
    it('is optional and omitting it is valid', () => {
      const { notes, ...rest } = validContact;
      const result = validateContact(rest);
      expect(result.valid).toBe(true);
    });

    it('accepts notes at 79 characters (boundary)', () => {
      const result = validateContact({ ...validContact, notes: 'n'.repeat(79) });
      expect(result.valid).toBe(true);
      expect(result.data.notes).toHaveLength(79);
    });

    it('accepts notes at exactly 80 characters (boundary)', () => {
      const result = validateContact({ ...validContact, notes: 'n'.repeat(80) });
      expect(result.valid).toBe(true);
      expect(result.data.notes).toHaveLength(80);
      expect(LIMITS.notes).toBe(80);
    });

    it('rejects notes at 81 characters (boundary)', () => {
      const result = validateContact({ ...validContact, notes: 'n'.repeat(81) });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('notes must be at most 80 characters');
    });

    it('accepts an empty string for notes', () => {
      const result = validateContact({ ...validContact, notes: '' });
      expect(result.valid).toBe(true);
      expect(result.data.notes).toBe('');
    });

    it('rejects a non-string notes value', () => {
      const result = validateContact({ ...validContact, notes: 12345 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('notes must be a string');
    });
  });

  // --- partial mode (used by PUT) -------------------------------------------
  describe('partial mode', () => {
    it('does not require missing fields when partial is true', () => {
      const result = validateContact({ firstName: 'Grace' }, { partial: true });
      expect(result.valid).toBe(true);
      expect(result.data).toEqual({ firstName: 'Grace' });
    });

    it('still validates fields that ARE present, even when partial', () => {
      const result = validateContact({ email: 'not-an-email' }, { partial: true });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('email must be a valid email address');
    });

    it('still rejects an explicitly-empty required field when partial', () => {
      const result = validateContact({ firstName: '' }, { partial: true });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('firstName is required');
    });

    it('an empty object is valid when partial (no-op update)', () => {
      const result = validateContact({}, { partial: true });
      expect(result.valid).toBe(true);
      expect(result.data).toEqual({});
    });
  });
});
