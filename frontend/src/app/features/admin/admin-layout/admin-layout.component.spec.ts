import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AuthStore } from '../../../core/auth/auth.store';
import { SessionUser } from '../../../core/models';
import { AdminLayoutComponent } from './admin-layout.component';

describe('AdminLayoutComponent', () => {
  let logoutSpy: jasmine.Spy;

  beforeEach(async () => {
    logoutSpy = jasmine.createSpy('logout');

    await TestBed.configureTestingModule({
      imports: [AdminLayoutComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthStore,
          useValue: {
            user: signal<SessionUser | null>({
              id: 'u1',
              documentNumber: 'CC-ADMIN-001',
              role: 'ADMIN',
            }),
            logout: logoutSpy,
          },
        },
      ],
    }).compileComponents();
  });

  it('se crea y muestra el documento del admin', () => {
    const fixture = TestBed.createComponent(AdminLayoutComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('CC-ADMIN-001');
  });

  it('el botón de cerrar sesión delega en authStore.logout()', () => {
    const fixture = TestBed.createComponent(AdminLayoutComponent);
    fixture.detectChanges();

    fixture.nativeElement
      .querySelector('button.session__logout')
      .click();

    expect(logoutSpy).toHaveBeenCalledTimes(1);
  });
});
