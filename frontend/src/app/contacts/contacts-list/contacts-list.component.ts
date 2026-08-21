import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs';

import { ConfirmDialogComponent, ConfirmDialogData } from '../confirm-dialog/confirm-dialog.component';
import { Contact } from '../contact.model';
import { ContactService } from '../contact.service';

const SEARCH_DEBOUNCE_MS = 300;

@Component({
  selector: 'app-contacts-list',
  imports: [
    ReactiveFormsModule,
    RouterModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
  ],
  templateUrl: './contacts-list.component.html',
  styleUrl: './contacts-list.component.scss',
})
export class ContactsListComponent implements OnInit, OnDestroy {
  private readonly contactService = inject(ContactService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroy$ = new Subject<void>();

  readonly displayedColumns = ['name', 'cellNumber', 'email', 'actions'];
  readonly searchControl = new FormControl('', { nonNullable: true });

  contacts: Contact[] = [];
  isLoading = false;
  hasError = false;

  ngOnInit(): void {
    this.searchControl.valueChanges
      .pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((term) => this.fetchContacts(term));

    this.fetchContacts('');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private fetchContacts(search: string): void {
    this.isLoading = true;
    this.hasError = false;
    this.contactService.getContacts(search).subscribe({
      next: (contacts) => {
        this.contacts = contacts;
        this.isLoading = false;
      },
      error: () => {
        this.hasError = true;
        this.isLoading = false;
        this.snackBar.open('Failed to load contacts. Please try again.', 'Dismiss', {
          duration: 5000,
        });
      },
    });
  }

  retry(): void {
    this.fetchContacts(this.searchControl.value);
  }

  onDelete(contact: Contact): void {
    const data: ConfirmDialogData = {
      title: 'Delete contact',
      message: `Are you sure you want to delete ${contact.firstName} ${contact.lastName}?`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
    };

    this.dialog
      .open(ConfirmDialogComponent, { data })
      .afterClosed()
      .pipe(switchMap((confirmed) => {
        if (!confirmed) {
          return [];
        }
        return this.contactService.deleteContact(contact.id);
      }))
      .subscribe({
        next: () => {
          this.contacts = this.contacts.filter((c) => c.id !== contact.id);
          this.snackBar.open('Contact deleted.', 'Dismiss', { duration: 3000 });
        },
        error: () => {
          this.snackBar.open('Failed to delete contact. Please try again.', 'Dismiss', {
            duration: 5000,
          });
        },
      });
  }
}
