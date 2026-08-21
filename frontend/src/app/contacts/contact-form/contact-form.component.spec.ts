import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';

import { Contact } from '../contact.model';
import { ContactService } from '../contact.service';
import { NOTES_MAX_LENGTH } from '../contact-validators';
import { ContactFormComponent } from './contact-form.component';

const sampleContact: Contact = {
  id: '1',
  firstName: 'Ada',
  lastName: 'Lovelace',
  cellNumber: '+1 555-123-4567',
  email: 'ada@example.com',
  notes: 'VIP',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

describe('ContactFormComponent (add mode)', () => {
  let fixture: ComponentFixture<ContactFormComponent>;
  let component: ContactFormComponent;
  let contactServiceSpy: jasmine.SpyObj<ContactService>;
  let router: Router;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;

  beforeEach(async () => {
    contactServiceSpy = jasmine.createSpyObj('ContactService', [
      'getContact',
      'createContact',
      'updateContact',
    ]);
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    await TestBed.configureTestingModule({
      imports: [ContactFormComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ContactService, useValue: contactServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({}) } },
        },
      ],
    })
      .overrideProvider(MatSnackBar, { useValue: snackBarSpy })
      .compileComponents();

    fixture = TestBed.createComponent(ContactFormComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    fixture.detectChanges();
  });

  it('should create in add mode without fetching a contact', () => {
    expect(component).toBeTruthy();
    expect(component.isEditMode).toBeFalse();
    expect(contactServiceSpy.getContact).not.toHaveBeenCalled();
  });

  it('should disable submit while the form is invalid', () => {
    expect(component.form.invalid).toBeTrue();
    expect(component.isSubmitDisabled).toBeTrue();
  });

  it('should enable submit once all required fields are valid', () => {
    component.form.setValue({
      firstName: 'Ada',
      lastName: 'Lovelace',
      cellNumber: '+1 555-123-4567',
      email: 'ada@example.com',
      notes: '',
    });
    expect(component.form.valid).toBeTrue();
    expect(component.isSubmitDisabled).toBeFalse();
  });

  it('should call createContact() and navigate to /contacts on successful submit', () => {
    contactServiceSpy.createContact.and.returnValue(of(sampleContact));
    component.form.setValue({
      firstName: 'Ada',
      lastName: 'Lovelace',
      cellNumber: '+1 555-123-4567',
      email: 'ada@example.com',
      notes: '',
    });

    component.onSubmit();

    expect(contactServiceSpy.createContact).toHaveBeenCalledWith({
      firstName: 'Ada',
      lastName: 'Lovelace',
      cellNumber: '+1 555-123-4567',
      email: 'ada@example.com',
      notes: undefined,
    });
    expect(router.navigate).toHaveBeenCalledWith(['/contacts']);
  });

  it('should not navigate and should surface a generic error when submit fails with no details', () => {
    contactServiceSpy.createContact.and.returnValue(
      throwError(() => ({ error: { error: 'Validation failed' } }))
    );
    component.form.setValue({
      firstName: 'Ada',
      lastName: 'Lovelace',
      cellNumber: '+1 555-123-4567',
      email: 'ada@example.com',
      notes: '',
    });

    component.onSubmit();

    expect(router.navigate).not.toHaveBeenCalled();
    expect(component.isSubmitting).toBeFalse();
    expect(snackBarSpy.open).toHaveBeenCalledWith('Validation failed', 'Dismiss', {
      duration: 5000,
    });
  });

  it('should surface the backend field-level details, not just the generic error string', () => {
    contactServiceSpy.createContact.and.returnValue(
      throwError(() => ({
        error: {
          error: 'Validation failed',
          details: ['email must be a valid email address', 'notes must be at most 80 characters'],
        },
      }))
    );
    component.form.setValue({
      firstName: 'Ada',
      lastName: 'Lovelace',
      cellNumber: '+1 555-123-4567',
      email: 'ada@example.com',
      notes: '',
    });

    component.onSubmit();

    expect(snackBarSpy.open).toHaveBeenCalledWith(
      'email must be a valid email address notes must be at most 80 characters',
      'Dismiss',
      { duration: 5000 }
    );
  });

  it('should track live notes character count', () => {
    component.form.controls.notes.setValue('a'.repeat(NOTES_MAX_LENGTH));
    expect(component.notesLength).toBe(NOTES_MAX_LENGTH);
    expect(component.form.controls.notes.valid).toBeTrue();
  });
});

describe('ContactFormComponent (edit mode)', () => {
  let fixture: ComponentFixture<ContactFormComponent>;
  let component: ContactFormComponent;
  let contactServiceSpy: jasmine.SpyObj<ContactService>;

  beforeEach(async () => {
    contactServiceSpy = jasmine.createSpyObj('ContactService', [
      'getContact',
      'createContact',
      'updateContact',
    ]);
    contactServiceSpy.getContact.and.returnValue(of(sampleContact));

    await TestBed.configureTestingModule({
      imports: [ContactFormComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ContactService, useValue: contactServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: '1' }) } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ContactFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should fetch the contact by id and pre-populate the form', () => {
    expect(contactServiceSpy.getContact).toHaveBeenCalledWith('1');
    expect(component.isEditMode).toBeTrue();
    expect(component.form.value.firstName).toBe('Ada');
    expect(component.form.value.lastName).toBe('Lovelace');
    expect(component.form.value.email).toBe('ada@example.com');
    expect(component.form.value.notes).toBe('VIP');
  });

  it('should call updateContact() with the id on submit', () => {
    contactServiceSpy.updateContact.and.returnValue(of(sampleContact));
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);

    component.onSubmit();

    expect(contactServiceSpy.updateContact).toHaveBeenCalledWith(
      '1',
      jasmine.objectContaining({ firstName: 'Ada' })
    );
  });
});
