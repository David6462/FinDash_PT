import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { Account } from '../models';
import { AccountStore } from './account.store';

function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: 'acc-1',
    accountNumber: 'AC-BASIC-0001',
    balance: '1234.56',
    tier: 'BASIC',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('AccountStore', () => {
  let store: AccountStore;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AccountStore,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    store = TestBed.inject(AccountStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('empieza con myAccount en null', () => {
    expect(store.myAccount()).toBeNull();
  });

  it('load() llama a GET /accounts/me y guarda la primera cuenta del array', () => {
    const first = makeAccount({ id: 'acc-1', balance: '999.99' });
    const second = makeAccount({ id: 'acc-2', balance: '1.00' });

    store.load().subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/accounts/me`);
    expect(req.request.method).toBe('GET');
    req.flush([first, second]);

    expect(store.myAccount()).toEqual(first);
  });

  it('load() deja myAccount en null si el array viene vacío', () => {
    store.load().subscribe();
    httpMock.expectOne(`${environment.apiUrl}/accounts/me`).flush([]);
    expect(store.myAccount()).toBeNull();
  });

  it('refresh() vuelve a pegarle al endpoint y actualiza el signal', () => {
    store.load().subscribe();
    httpMock
      .expectOne(`${environment.apiUrl}/accounts/me`)
      .flush([makeAccount({ balance: '100.00' })]);
    expect(store.myAccount()?.balance).toBe('100.00');

    store.refresh().subscribe();
    httpMock
      .expectOne(`${environment.apiUrl}/accounts/me`)
      .flush([makeAccount({ balance: '250.00' })]);

    expect(store.myAccount()?.balance).toBe('250.00');
  });

  it('un error de red no rompe el signal', () => {
    store.load().subscribe();
    httpMock
      .expectOne(`${environment.apiUrl}/accounts/me`)
      .error(new ProgressEvent('error'));
    expect(store.myAccount()).toBeNull();
  });
});
