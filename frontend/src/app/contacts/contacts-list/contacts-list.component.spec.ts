import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { Observable, of } from 'rxjs';

import { Contact } from '../contact.model';
import { ContactService } from '../contact.service';
import { ContactsListComponent } from './contacts-list.component';

const contacts: Contact[] = [
  {
    id: '1',
    firstName: 'Ada',
    lastName: 'Lovelace',
    cellNumber: '+1 555-123-4567',
    email: 'ada@example.com',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: '2',
    firstName: 'Grace',
    lastName: 'Hopper',
    cellNumber: '+1 555-987-6543',
    email: 'grace@example.com',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
];

describe('ContactsListComponent', () => {
  let fixture: ComponentFixture<ContactsListComponent>;
  let component: ContactsListComponent;
  let contactServiceSpy: jasmine.SpyObj<ContactService>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;

  beforeEach(async () => {
    contactServiceSpy = jasmine.createSpyObj('ContactService', ['getContacts', 'deleteContact']);
    contactServiceSpy.getContacts.and.returnValue(of(contacts));
    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);

    await TestBed.configureTestingModule({
      imports: [ContactsListComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ContactService, useValue: contactServiceSpy },
      ],
    }).compileComponents();

    // MatDialog is a tree-shakable `providedIn: 'root'` service; overrideProvider
    // guarantees the mock replaces it (a plain `providers` entry can lose to the
    // root provider depending on injector resolution order).
    TestBed.overrideProvider(MatDialog, { useValue: dialogSpy });

    fixture = TestBed.createComponent(ContactsListComponent);
    component = fixture.componentInstance;
  });

  it('should create and load contacts on init', () => {
    fixture.detectChanges();
    expect(contactServiceSpy.getContacts).toHaveBeenCalledWith('');
    expect(component.contacts.length).toBe(2);
  });

  it('should render a row per contact', () => {
    fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll('[data-testid="contact-row"]');
    expect(rows.length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Ada Lovelace');
    expect(fixture.nativeElement.textContent).toContain('Grace Hopper');
  });

  it('should render the empty state when there are no contacts', () => {
    contactServiceSpy.getContacts.and.returnValue(of([]));
    fixture.detectChanges();
    const empty = fixture.nativeElement.querySelector('[data-testid="empty-state"]');
    expect(empty).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('[data-testid="contact-row"]').length).toBe(0);
  });

  it('should show the error state and not the table when loading fails', () => {
    contactServiceSpy.getContacts.and.returnValue(
      new Observable((subscriber) => subscriber.error('boom'))
    );
    fixture.detectChanges();
    expect(component.hasError).toBeTrue();
    expect(fixture.nativeElement.querySelector('.error-state')).toBeTruthy();
  });

  it('should debounce search input and re-fetch with the search term', async () => {
    fixture.detectChanges();
    contactServiceSpy.getContacts.calls.reset();

    component.searchControl.setValue('ada');

    // Zoneless app (no zone.js) -- use a real timer instead of fakeAsync/tick.
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(contactServiceSpy.getContacts).not.toHaveBeenCalled();

    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(contactServiceSpy.getContacts).toHaveBeenCalledWith('ada');
  });

  describe('delete flow', () => {
    it('should call deleteContact only when the confirm dialog resolves true', () => {
      fixture.detectChanges();
      contactServiceSpy.deleteContact.and.returnValue(of(undefined));
      dialogSpy.open.and.returnValue({ afterClosed: () => of(true) } as MatDialogRef<
        unknown,
        boolean
      >);

      component.onDelete(contacts[0]);

      expect(dialogSpy.open).toHaveBeenCalled();
      expect(contactServiceSpy.deleteContact).toHaveBeenCalledWith('1');
      expect(component.contacts.find((c) => c.id === '1')).toBeUndefined();
    });

    it('should NOT call deleteContact when the confirm dialog is cancelled', () => {
      fixture.detectChanges();
      dialogSpy.open.and.returnValue({ afterClosed: () => of(false) } as MatDialogRef<
        unknown,
        boolean
      >);

      component.onDelete(contacts[0]);

      expect(dialogSpy.open).toHaveBeenCalled();
      expect(contactServiceSpy.deleteContact).not.toHaveBeenCalled();
      expect(component.contacts.length).toBe(2);
    });
  });
});
