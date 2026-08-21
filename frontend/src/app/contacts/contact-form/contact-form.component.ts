import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';

import { ContactInput } from '../contact.model';
import { ContactService } from '../contact.service';
import {
  NOTES_MAX_LENGTH,
  cellNumberValidators,
  emailValidators,
  firstNameValidators,
  lastNameValidators,
  notesValidators,
} from '../contact-validators';

/**
 * Reactive form shared by the "add contact" (/contacts/new) and
 * "edit contact" (/contacts/:id/edit) routes.
 */
@Component({
  selector: 'app-contact-form',
  imports: [
    ReactiveFormsModule,
    RouterModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  templateUrl: './contact-form.component.html',
  styleUrl: './contact-form.component.scss',
})
export class ContactFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly contactService = inject(ContactService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  readonly notesMaxLength = NOTES_MAX_LENGTH;

  readonly form = this.fb.nonNullable.group({
    firstName: ['', firstNameValidators],
    lastName: ['', lastNameValidators],
    cellNumber: ['', cellNumberValidators],
    email: ['', emailValidators],
    notes: ['', notesValidators],
  });

  contactId: string | null = null;
  isEditMode = false;
  isLoading = false;
  isSubmitting = false;
  loadError = false;

  get isSubmitDisabled(): boolean {
    return this.form.invalid || this.isSubmitting || this.isLoading;
  }

  get notesLength(): number {
    return this.form.controls.notes.value?.length ?? 0;
  }

  ngOnInit(): void {
    this.contactId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = this.contactId !== null;

    if (this.isEditMode && this.contactId) {
      this.isLoading = true;
      this.contactService
        .getContact(this.contactId)
        .pipe(finalize(() => (this.isLoading = false)))
        .subscribe({
          next: (contact) => {
            this.form.patchValue({
              firstName: contact.firstName,
              lastName: contact.lastName,
              cellNumber: contact.cellNumber,
              email: contact.email,
              notes: contact.notes ?? '',
            });
          },
          error: () => {
            this.loadError = true;
            this.snackBar.open('Failed to load contact.', 'Dismiss', { duration: 5000 });
          },
        });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      return;
    }

    const raw = this.form.getRawValue();
    const payload: ContactInput = {
      firstName: raw.firstName.trim(),
      lastName: raw.lastName.trim(),
      cellNumber: raw.cellNumber.trim(),
      email: raw.email.trim(),
      notes: raw.notes.trim() || undefined,
    };

    this.isSubmitting = true;
    const request$ =
      this.isEditMode && this.contactId
        ? this.contactService.updateContact(this.contactId, payload)
        : this.contactService.createContact(payload);

    request$.pipe(finalize(() => (this.isSubmitting = false))).subscribe({
      next: () => {
        this.snackBar.open(
          this.isEditMode ? 'Contact updated.' : 'Contact created.',
          'Dismiss',
          { duration: 3000 }
        );
        this.router.navigate(['/contacts']);
      },
      error: (err) => {
        const details: string[] | undefined = err?.error?.details;
        const message =
          details && details.length > 0
            ? details.join(' ')
            : (err?.error?.error ?? 'Failed to save contact. Please try again.');
        this.snackBar.open(message, 'Dismiss', { duration: 5000 });
      },
    });
  }

  onCancel(): void {
    this.router.navigate(['/contacts']);
  }
}
