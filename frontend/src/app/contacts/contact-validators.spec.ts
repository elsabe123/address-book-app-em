import { FormControl } from '@angular/forms';

import {
  NAME_MAX_LENGTH,
  NOTES_MAX_LENGTH,
  cellNumberValidators,
  emailValidators,
  firstNameValidators,
  lastNameValidators,
  notesValidators,
} from './contact-validators';

describe('contact-validators', () => {
  describe('firstName / lastName validators', () => {
    it('should require a value', () => {
      const control = new FormControl('', firstNameValidators);
      expect(control.hasError('required')).toBeTrue();
    });

    it('should reject a whitespace-only value as blank', () => {
      const control = new FormControl('   ', firstNameValidators);
      expect(control.hasError('blank')).toBeTrue();
    });

    it('should accept a valid name', () => {
      const control = new FormControl('Ada', firstNameValidators);
      expect(control.valid).toBeTrue();
    });

    it(`should accept a name exactly ${NAME_MAX_LENGTH} chars long`, () => {
      const control = new FormControl('a'.repeat(NAME_MAX_LENGTH), lastNameValidators);
      expect(control.valid).toBeTrue();
    });

    it(`should reject a name longer than ${NAME_MAX_LENGTH} chars`, () => {
      const control = new FormControl('a'.repeat(NAME_MAX_LENGTH + 1), lastNameValidators);
      expect(control.hasError('maxlength')).toBeTrue();
    });
  });

  describe('cellNumber validator', () => {
    it('should require a value', () => {
      const control = new FormControl('', cellNumberValidators);
      expect(control.hasError('required')).toBeTrue();
    });

    it('should accept a plausible phone number', () => {
      const control = new FormControl('+1 555-123-4567', cellNumberValidators);
      expect(control.valid).toBeTrue();
    });

    it('should accept a plain digit-only number within length bounds', () => {
      const control = new FormControl('1234567', cellNumberValidators);
      expect(control.valid).toBeTrue();
    });

    it('should reject a number that is too short', () => {
      const control = new FormControl('12345', cellNumberValidators);
      expect(control.hasError('pattern')).toBeTrue();
    });

    it('should reject a number that is too long', () => {
      const control = new FormControl('1'.repeat(21), cellNumberValidators);
      expect(control.hasError('pattern')).toBeTrue();
    });

    it('should reject letters', () => {
      const control = new FormControl('555-CALL-NOW', cellNumberValidators);
      expect(control.hasError('pattern')).toBeTrue();
    });
  });

  describe('email validator', () => {
    it('should require a value', () => {
      const control = new FormControl('', emailValidators);
      expect(control.hasError('required')).toBeTrue();
    });

    it('should accept a valid email', () => {
      const control = new FormControl('ada@example.com', emailValidators);
      expect(control.valid).toBeTrue();
    });

    it('should reject an email missing the @', () => {
      const control = new FormControl('ada.example.com', emailValidators);
      expect(control.hasError('pattern')).toBeTrue();
    });

    it('should reject an email missing a domain suffix', () => {
      const control = new FormControl('ada@example', emailValidators);
      expect(control.hasError('pattern')).toBeTrue();
    });

    // Parity with backend/src/models/contact.js PATTERNS.email — these must
    // stay in lockstep so a client-"valid" email never fails at the API.
    it('should reject consecutive dots in the domain (rejected by the backend)', () => {
      const control = new FormControl('ada@example..com', emailValidators);
      expect(control.hasError('pattern')).toBeTrue();
    });

    it('should reject a domain label starting with a hyphen (rejected by the backend)', () => {
      const control = new FormControl('ada@-example.com', emailValidators);
      expect(control.hasError('pattern')).toBeTrue();
    });
  });

  describe('notes validator (optional, 80-char max)', () => {
    it('should allow an empty value (optional field)', () => {
      const control = new FormControl('', notesValidators);
      expect(control.valid).toBeTrue();
    });

    it(`should accept exactly ${NOTES_MAX_LENGTH} chars (boundary)`, () => {
      const control = new FormControl('a'.repeat(NOTES_MAX_LENGTH), notesValidators);
      expect(control.valid).toBeTrue();
    });

    it(`should accept ${NOTES_MAX_LENGTH - 1} chars (boundary - 1)`, () => {
      const control = new FormControl('a'.repeat(NOTES_MAX_LENGTH - 1), notesValidators);
      expect(control.valid).toBeTrue();
    });

    it(`should reject ${NOTES_MAX_LENGTH + 1} chars (boundary + 1)`, () => {
      const control = new FormControl('a'.repeat(NOTES_MAX_LENGTH + 1), notesValidators);
      expect(control.hasError('maxlength')).toBeTrue();
    });
  });
});
