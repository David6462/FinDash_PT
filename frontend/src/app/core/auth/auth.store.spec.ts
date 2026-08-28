import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { Router } from '@angular/router';

import { environment } from '../../../environments/environment';
import { AuthStore } from './auth.store';

const TOKEN_KEY = 'findash.token';
const USER_KEY = 'findash.user';

/** base64url sin padding. */
function b64url(obj: unknown): string {
  return btoa(JSON.stringify(obj))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/** Arma un JWT decodificable (la firma no se verifica en el frontend). */
function makeJwt(payload: Record<string, unknown>): string {
  return `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url(payload)}.sig`;
}

function validToken(role: 'ADMIN' | 'CLIENT' = 'CLIENT'): string {
  return makeJwt({
    sub: 'user-1',
    documentNumber: 'CC-CLIENT-001',
    role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  });
}

function expiredToken(): string {
  return makeJwt({
    sub: 'user-1',
    documentNumber: 'CC-CLIENT-001',
    role: 'CLIENT',
    iat: Math.floor(Date.now() / 1000) - 7200,
    exp: Math.floor(Date.now() / 1000) - 10,
  });
}

describe('AuthStore', () => {
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(() => {
    localStorage.clear();
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: routerSpy },
      ],
    });
  });

  afterEach(() => localStorage.clear());

  function createStore(): {
    store: AuthStore;
    httpMock: HttpTestingController;
  } {
    const store = TestBed.inject(AuthStore);
    const httpMock = TestBed.inject(HttpTestingController);
    return { store, httpMock };
  }

  describe('estado inicial', () => {
    it('sin nada en localStorage arranca deslogueado', () => {
      const { store } = createStore();
      expect(store.isAuthenticated()).toBe(false);
      expect(store.user()).toBeNull();
      expect(store.token()).toBeNull();
      expect(store.role()).toBeNull();
    });
  });

  describe('login()', () => {
    it('éxito: actualiza signals y persiste en localStorage', () => {
      const { store, httpMock } = createStore();
      const token = validToken('CLIENT');

      store.login('CC-CLIENT-001', 'secret').subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      expect(req.request.method).toBe('POST');
      req.flush({ accessToken: token });

      expect(store.token()).toBe(token);
      expect(store.isAuthenticated()).toBe(true);
      expect(store.user()).toEqual({
        id: 'user-1',
        documentNumber: 'CC-CLIENT-001',
        role: 'CLIENT',
      });
      expect(localStorage.getItem(TOKEN_KEY)).toBe(token);
      expect(JSON.parse(localStorage.getItem(USER_KEY)!).role).toBe('CLIENT');

      httpMock.verify();
    });

    it('fallo HTTP: no toca el estado', () => {
      const { store, httpMock } = createStore();

      store
        .login('CC-CLIENT-001', 'bad')
        .subscribe({ error: () => undefined });

      httpMock
        .expectOne(`${environment.apiUrl}/auth/login`)
        .flush(
          { message: 'Credenciales inválidas' },
          { status: 401, statusText: 'Unauthorized' },
        );

      expect(store.isAuthenticated()).toBe(false);
      expect(store.user()).toBeNull();
      expect(localStorage.getItem(TOKEN_KEY)).toBeNull();

      httpMock.verify();
    });

    it('token ilegible en la respuesta: fuerza logout (estado limpio + navega)', () => {
      const { store, httpMock } = createStore();

      store.login('CC-CLIENT-001', 'secret').subscribe();
      httpMock
        .expectOne(`${environment.apiUrl}/auth/login`)
        .flush({ accessToken: 'no-es-un-jwt' });

      expect(store.isAuthenticated()).toBe(false);
      expect(store.user()).toBeNull();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);

      httpMock.verify();
    });

    it('el signal computed role refleja el rol del usuario', () => {
      const { store, httpMock } = createStore();

      store.login('CC-ADMIN-001', 'secret').subscribe();
      httpMock
        .expectOne(`${environment.apiUrl}/auth/login`)
        .flush({ accessToken: validToken('ADMIN') });

      expect(store.role()).toBe('ADMIN');
      httpMock.verify();
    });
  });

  describe('logout()', () => {
    it('limpia signals, localStorage y navega a /login', () => {
      localStorage.setItem(TOKEN_KEY, validToken('CLIENT'));
      const { store } = createStore();
      expect(store.isAuthenticated()).toBe(true);

      store.logout();

      expect(store.isAuthenticated()).toBe(false);
      expect(store.user()).toBeNull();
      expect(store.token()).toBeNull();
      expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
      expect(localStorage.getItem(USER_KEY)).toBeNull();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('restoreSession() al inicializar', () => {
    it('restaura la sesión desde un token válido en localStorage', () => {
      const token = validToken('ADMIN');
      localStorage.setItem(TOKEN_KEY, token);

      const { store } = createStore();

      expect(store.isAuthenticated()).toBe(true);
      expect(store.token()).toBe(token);
      expect(store.role()).toBe('ADMIN');
    });

    it('descarta un token expirado y limpia el storage', () => {
      localStorage.setItem(TOKEN_KEY, expiredToken());
      localStorage.setItem(USER_KEY, '{"stale":true}');

      const { store } = createStore();

      expect(store.isAuthenticated()).toBe(false);
      expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
      expect(localStorage.getItem(USER_KEY)).toBeNull();
    });
  });
});
