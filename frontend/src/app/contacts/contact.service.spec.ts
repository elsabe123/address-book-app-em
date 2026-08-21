import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { Contact, ContactInput } from './contact.model';
import { ContactService } from './contact.service';

describe('ContactService', () => {
  let service: ContactService;
  let httpMock: HttpTestingController;
  const baseUrl = 'http://localhost:3000/api/contacts';

  const sampleContact: Contact = {
    id: '1',
    firstName: 'Ada',
    lastName: 'Lovelace',
    cellNumber: '+1 555-123-4567',
    email: 'ada@example.com',
    notes: 'Met at conference',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ContactService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ContactService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getContacts() should GET the contacts list without a search param', () => {
    service.getContacts().subscribe((contacts) => {
      expect(contacts).toEqual([sampleContact]);
    });

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.has('search')).toBeFalse();
    req.flush([sampleContact]);
  });

  it('getContacts(search) should GET with the search query param', () => {
    service.getContacts('ada').subscribe((contacts) => {
      expect(contacts).toEqual([sampleContact]);
    });

    const req = httpMock.expectOne((r) => r.url === baseUrl && r.params.get('search') === 'ada');
    expect(req.request.method).toBe('GET');
    req.flush([sampleContact]);
  });

  it('getContacts() should omit the search param when given only whitespace', () => {
    service.getContacts('   ').subscribe();

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.params.has('search')).toBeFalse();
    req.flush([]);
  });

  it('getContact(id) should GET a single contact by id', () => {
    service.getContact('1').subscribe((contact) => {
      expect(contact).toEqual(sampleContact);
    });

    const req = httpMock.expectOne(`${baseUrl}/1`);
    expect(req.request.method).toBe('GET');
    req.flush(sampleContact);
  });

  it('createContact() should POST the contact payload', () => {
    const input: ContactInput = {
      firstName: 'Ada',
      lastName: 'Lovelace',
      cellNumber: '+1 555-123-4567',
      email: 'ada@example.com',
      notes: 'Met at conference',
    };

    service.createContact(input).subscribe((contact) => {
      expect(contact).toEqual(sampleContact);
    });

    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(input);
    req.flush(sampleContact, { status: 201, statusText: 'Created' });
  });

  it('updateContact() should PUT the contact payload to /:id', () => {
    const input: ContactInput = {
      firstName: 'Ada',
      lastName: 'Byron',
      cellNumber: '+1 555-123-4567',
      email: 'ada@example.com',
    };

    service.updateContact('1', input).subscribe((contact) => {
      expect(contact).toEqual({ ...sampleContact, lastName: 'Byron' });
    });

    const req = httpMock.expectOne(`${baseUrl}/1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(input);
    req.flush({ ...sampleContact, lastName: 'Byron' });
  });

  it('deleteContact() should DELETE /:id', () => {
    service.deleteContact('1').subscribe((response) => {
      expect(response).toBeNull();
    });

    const req = httpMock.expectOne(`${baseUrl}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
  });
});
