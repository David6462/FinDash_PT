import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { AuthStore } from '../../../core/auth/auth.store';
import { AccountRole } from '../../../core/models';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;

  let loginSpy: jasmine.Spy;
  let role: AccountRole | null;
  let navigateByUrlSpy: jasmine.Spy;
  let returnUrl: string | null;

  beforeEach(async () => {
    role = 'CLIENT';
    returnUrl = null;
    loginSpy = jasmine.createSpy('login').and.returnValue(of({ accessToken: 't' }));
    navigateByUrlSpy = jasmine.createSpy('navigateByUrl');

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        {
          provide: AuthStore,
          useValue: { login: loginSpy, role: () => role },
        },
        { provide: Router, useValue: { navigateByUrl: navigateByUrlSpy } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: { get: () => returnUrl } },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function fillValid() {
    component.form.setValue({ documentNumber: 'CC-CLIENT-001', password: 'secret' });
  }

  it('no llama a login con el formulario inválido', () => {
    component.form.setValue({ documentNumber: '', password: '123' });
    component.submit();
    expect(loginSpy).not.toHaveBeenCalled();
    expect(component.form.controls.documentNumber.touched).toBe(true);
  });

  it('login exitoso de un CLIENT navega a /client/transfer', () => {
    role = 'CLIENT';
    fillValid();
    component.submit();
    expect(loginSpy).toHaveBeenCalledWith('CC-CLIENT-001', 'secret');
    expect(navigateByUrlSpy).toHaveBeenCalledWith('/client/transfer');
    expect(component.loading()).toBe(false);
  });

  it('login exitoso de un ADMIN navega a /admin/dashboard', () => {
    role = 'ADMIN';
    fillValid();
    component.submit();
    expect(navigateByUrlSpy).toHaveBeenCalledWith('/admin/dashboard');
  });

  it('respeta el returnUrl cuando está presente', () => {
    returnUrl = '/admin/accounts';
    fillValid();
    component.submit();
    expect(navigateByUrlSpy).toHaveBeenCalledWith('/admin/accounts');
  });

  it('muestra el mensaje del backend ante un error', () => {
    loginSpy.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 401,
            error: { message: 'Credenciales inválidas' },
          }),
      ),
    );
    fillValid();
    component.submit();
    expect(component.errorMessage()).toBe('Credenciales inválidas');
    expect(component.loading()).toBe(false);
    expect(navigateByUrlSpy).not.toHaveBeenCalled();
  });

  it('usa el primer elemento cuando message es un array', () => {
    loginSpy.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { message: ['documentNumber should not be empty'] },
          }),
      ),
    );
    fillValid();
    component.submit();
    expect(component.errorMessage()).toBe('documentNumber should not be empty');
  });

  it('muestra mensaje de conexión ante status 0', () => {
    loginSpy.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 0, error: null })),
    );
    fillValid();
    component.submit();
    expect(component.errorMessage()).toBe('No se pudo conectar con el servidor.');
  });
});
