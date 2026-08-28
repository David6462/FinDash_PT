import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import { authInterceptor } from './auth.interceptor';
import { AuthStore } from './auth.store';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let authStoreSpy: jasmine.SpyObj<
    Pick<AuthStore, 'token' | 'isAuthenticated' | 'logout'>
  >;

  const URL = 'http://localhost:3000/accounts/me';

  beforeEach(() => {
    authStoreSpy = jasmine.createSpyObj('AuthStore', [
      'token',
      'isAuthenticated',
      'logout',
    ]);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthStore, useValue: authStoreSpy },
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('con token agrega el header Authorization Bearer', () => {
    authStoreSpy.token.and.returnValue('jwt-abc');
    authStoreSpy.isAuthenticated.and.returnValue(true);

    http.get(URL).subscribe();

    const req = httpMock.expectOne(URL);
    expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-abc');
    req.flush({});
  });

  it('sin token no agrega el header Authorization', () => {
    authStoreSpy.token.and.returnValue(null);
    authStoreSpy.isAuthenticated.and.returnValue(false);

    http.get(URL).subscribe();

    const req = httpMock.expectOne(URL);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('ante un 401 con sesión activa llama a logout()', () => {
    authStoreSpy.token.and.returnValue('jwt-abc');
    authStoreSpy.isAuthenticated.and.returnValue(true);

    http.get(URL).subscribe({ error: () => undefined });

    httpMock
      .expectOne(URL)
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(authStoreSpy.logout).toHaveBeenCalledTimes(1);
  });

  it('un 401 sin sesión activa no dispara logout()', () => {
    authStoreSpy.token.and.returnValue(null);
    authStoreSpy.isAuthenticated.and.returnValue(false);

    http.get(URL).subscribe({ error: () => undefined });

    httpMock
      .expectOne(URL)
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(authStoreSpy.logout).not.toHaveBeenCalled();
  });

  it('otros errores (500) se propagan sin tocar la sesión', () => {
    authStoreSpy.token.and.returnValue('jwt-abc');
    authStoreSpy.isAuthenticated.and.returnValue(true);

    let capturedStatus = 0;
    http.get(URL).subscribe({ error: (e) => (capturedStatus = e.status) });

    httpMock
      .expectOne(URL)
      .flush({}, { status: 500, statusText: 'Server Error' });

    expect(capturedStatus).toBe(500);
    expect(authStoreSpy.logout).not.toHaveBeenCalled();
  });
});
