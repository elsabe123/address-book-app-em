import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'contacts' },
  {
    path: 'contacts',
    loadComponent: () =>
      import('./contacts/contacts-list/contacts-list.component').then(
        (m) => m.ContactsListComponent
      ),
  },
  {
    path: 'contacts/new',
    loadComponent: () =>
      import('./contacts/contact-form/contact-form.component').then(
        (m) => m.ContactFormComponent
      ),
  },
  {
    path: 'contacts/:id/edit',
    loadComponent: () =>
      import('./contacts/contact-form/contact-form.component').then(
        (m) => m.ContactFormComponent
      ),
  },
  { path: '**', redirectTo: 'contacts' },
];
