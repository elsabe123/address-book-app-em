import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { ConfirmDialogComponent, ConfirmDialogData } from './confirm-dialog.component';

describe('ConfirmDialogComponent', () => {
  let component: ConfirmDialogComponent;
  let fixture: ComponentFixture<ConfirmDialogComponent>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<ConfirmDialogComponent, boolean>>;

  const data: ConfirmDialogData = {
    title: 'Delete contact',
    message: 'Are you sure you want to delete Ada Lovelace?',
  };

  beforeEach(async () => {
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [ConfirmDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the title and message', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Delete contact');
    expect(el.textContent).toContain('Are you sure you want to delete Ada Lovelace?');
  });

  it('should close with true when confirm is clicked', () => {
    const buttons = fixture.nativeElement.querySelectorAll('button');
    const confirmButton: HTMLButtonElement = Array.from(buttons).find((b) =>
      (b as HTMLButtonElement).textContent?.includes('Delete')
    ) as HTMLButtonElement;

    confirmButton.click();

    expect(dialogRefSpy.close).toHaveBeenCalledWith(true);
    expect(dialogRefSpy.close).toHaveBeenCalledTimes(1);
  });

  it('should close with false when cancel is clicked, without ever calling close(true)', () => {
    const buttons = fixture.nativeElement.querySelectorAll('button');
    const cancelButton: HTMLButtonElement = Array.from(buttons).find((b) =>
      (b as HTMLButtonElement).textContent?.includes('Cancel')
    ) as HTMLButtonElement;

    cancelButton.click();

    expect(dialogRefSpy.close).toHaveBeenCalledWith(false);
    expect(dialogRefSpy.close).not.toHaveBeenCalledWith(true);
  });
});
