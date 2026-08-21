import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { Contact, ContactInput } from './contact.model';

/**
 * HttpClient wrapper around the Address Book REST API.
 * See docs/SDD/1-address-book-crud.spec.md §4 for the API contract.
 */
@Injectable({ providedIn: 'root' })
export class ContactService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:3000/api/contacts';

  /** GET /api/contacts?search=<term> */
  getContacts(search?: string): Observable<Contact[]> {
    let params = new HttpParams();
    if (search && search.trim().length > 0) {
      params = params.set('search', search.trim());
    }
    return this.http.get<Contact[]>(this.baseUrl, { params });
  }

  /** GET /api/contacts/:id */
  getContact(id: string): Observable<Contact> {
    return this.http.get<Contact>(`${this.baseUrl}/${id}`);
  }

  /** POST /api/contacts */
  createContact(contact: ContactInput): Observable<Contact> {
    return this.http.post<Contact>(this.baseUrl, contact);
  }

  /** PUT /api/contacts/:id */
  updateContact(id: string, contact: ContactInput): Observable<Contact> {
    return this.http.put<Contact>(`${this.baseUrl}/${id}`, contact);
  }

  /** DELETE /api/contacts/:id */
  deleteContact(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
