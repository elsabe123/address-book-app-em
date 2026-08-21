import { AbstractControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

/**
 * Client-side validation constants, mirroring the single source of truth in
 * docs/SDD/1-address-book-crud.spec.md §3, so the frontend never drifts from
 * the backend's rules.
 */
export const NAME_MAX_LENGTH = 50;
export const NOTES_MAX_LENGTH = 80;

/** `^\+?[0-9\s\-()]{7,20}$` — required, E.164-ish phone format. */
export const CELL_NUMBER_PATTERN = /^\+?[0-9\s\-()]{7,20}$/;

/**
 * RFC 5322-lite email format check — MUST stay byte-for-byte identical to
 * `PATTERNS.email` in backend/src/models/contact.js so client-side "valid"
 * never disagrees with the server's validation.
 */
export const EMAIL_PATTERN =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/**
 * Fails when the control's value is empty or only whitespace.
 * `Validators.required` alone would accept a string of spaces.
 */
export function notBlank(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (typeof value === 'string' && value.trim().length === 0 && value.length > 0) {
      return { blank: true };
    }
    return null;
  };
}

export const firstNameValidators: ValidatorFn[] = [
  Validators.required,
  notBlank(),
  Validators.maxLength(NAME_MAX_LENGTH),
];

export const lastNameValidators: ValidatorFn[] = [
  Validators.required,
  notBlank(),
  Validators.maxLength(NAME_MAX_LENGTH),
];

export const cellNumberValidators: ValidatorFn[] = [
  Validators.required,
  Validators.pattern(CELL_NUMBER_PATTERN),
];

export const emailValidators: ValidatorFn[] = [
  Validators.required,
  Validators.pattern(EMAIL_PATTERN),
];

export const notesValidators: ValidatorFn[] = [Validators.maxLength(NOTES_MAX_LENGTH)];
