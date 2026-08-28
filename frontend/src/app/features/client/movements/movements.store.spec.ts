import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import { environment } from '../../../../environments/environment';
import { Account, PaginatedResult, Transaction } from '../../../core/models';
import { MovementsStore } from './movements.store';

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-1',
    sourceAccount: null,
    destinationAccount: null,
    amount: '100.00',
    commissionCharged: '1.00',
    totalDebited: '101.00',
    status: 'COMPLETED',
    rejectionReason: null,
    idempotencyKey: 'key-1',
    authorizationCode: 'AUTH-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function page(data: Transaction[]): PaginatedResult<Transaction> {
  return { data, meta: { page: 1, limit: 10, total: data.length, totalPages: 1 } };
}

const account = (accountNumber: string): Account => ({
  id: accountNumber,
  accountNumber,
  balance: '0.00',
  tier: 'BASIC',
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00.000Z',
});

describe('MovementsStore', () => {
  let store: MovementsStore;
  let httpMock: HttpTestingController;

  const accountsUrl = `${environment.apiUrl}/accounts/me`;
  const txUrl = `${environment.apiUrl}/transactions/me`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        MovementsStore,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    store = TestBed.inject(MovementsStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('load() trae las cuentas propias y luego la página de movimientos', () => {
    store.load(2).subscribe();

    httpMock
      .expectOne(accountsUrl)
      .flush([account('AC-MINE-1'), account('AC-MINE-2')]);

    const req = httpMock.expectOne(
      (r) => r.url === txUrl && r.params.get('page') === '2',
    );
    expect(req.request.params.get('limit')).toBe('10');
    req.flush(page([makeTx()]));

    expect(store.movements().length).toBe(1);
    expect(store.meta()?.page).toBe(1);
    expect(store.myAccountNumbers()).toEqual(['AC-MINE-1', 'AC-MINE-2']);
    expect(store.loading()).toBe(false);
  });

  it('cachea las cuentas propias: la 2da carga no vuelve a pedir /accounts/me', () => {
    store.load(1).subscribe();
    httpMock.expectOne(accountsUrl).flush([account('AC-MINE-1')]);
    httpMock.expectOne((r) => r.url === txUrl).flush(page([makeTx()]));

    store.load(2).subscribe();
    httpMock.expectNone(accountsUrl);
    httpMock.expectOne((r) => r.url === txUrl).flush(page([]));

    expect(store.myAccountNumbers()).toEqual(['AC-MINE-1']);
  });

  it('un error en /transactions/me setea error y deja la lista vacía', () => {
    store.load(1).subscribe();
    httpMock.expectOne(accountsUrl).flush([account('AC-MINE-1')]);
    httpMock
      .expectOne((r) => r.url === txUrl)
      .flush(
        { message: 'Boom' },
        { status: 500, statusText: 'Server Error' },
      );

    expect(store.error()).toBe('Boom');
    expect(store.movements()).toEqual([]);
    expect(store.meta()).toBeNull();
    expect(store.loading()).toBe(false);
  });

  it('un fallo de red (status 0) muestra el mensaje de conexión', () => {
    store.load(1).subscribe();
    httpMock.expectOne(accountsUrl).flush([account('AC-MINE-1')]);
    httpMock.expectOne((r) => r.url === txUrl).error(new ProgressEvent('error'));

    expect(store.error()).toBe('No se pudo conectar con el servidor.');
  });

  it('sin message legible cae al texto genérico', () => {
    store.load(1).subscribe();
    httpMock.expectOne(accountsUrl).flush([account('AC-MINE-1')]);
    httpMock
      .expectOne((r) => r.url === txUrl)
      .flush({}, { status: 500, statusText: 'Server Error' });

    expect(store.error()).toBe('No se pudieron cargar los movimientos.');
  });
});
