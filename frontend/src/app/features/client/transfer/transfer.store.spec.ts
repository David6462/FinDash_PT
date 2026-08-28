import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  TestRequest,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { of } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { AccountStore } from '../../../core/account/account.store';
import { Transaction } from '../../../core/models';
import { TransferStore } from './transfer.store';

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
    authorizationCode: 'AUTH-123',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('TransferStore', () => {
  let store: TransferStore;
  let httpMock: HttpTestingController;
  let accountStoreSpy: jasmine.SpyObj<AccountStore>;

  beforeEach(() => {
    accountStoreSpy = jasmine.createSpyObj<AccountStore>('AccountStore', [
      'refresh',
    ]);
    accountStoreSpy.refresh.and.returnValue(of(null));

    TestBed.configureTestingModule({
      providers: [
        TransferStore,
        { provide: AccountStore, useValue: accountStoreSpy },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    store = TestBed.inject(TransferStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('tras una transferencia exitosa refresca el saldo (AccountStore.refresh)', () => {
    store.transfer('AC-PREMIUM-0001', 100).subscribe();

    const req = httpMock.expectOne(
      `${environment.apiUrl}/transactions/transfer`,
    );
    req.flush(makeTx());

    expect(store.lastResult()).not.toBeNull();
    expect(accountStoreSpy.refresh).toHaveBeenCalledTimes(1);
  });

  it('si la transferencia falla NO refresca el saldo', () => {
    store.transfer('AC-PREMIUM-0001', 100).subscribe({ error: () => undefined });

    httpMock
      .expectOne(`${environment.apiUrl}/transactions/transfer`)
      .flush(
        { message: 'Fondos insuficientes' },
        { status: 422, statusText: 'Unprocessable Entity' },
      );

    expect(accountStoreSpy.refresh).not.toHaveBeenCalled();
  });

  /** Lee el header X-Idempotency-Key de la request pendiente y la resuelve. */
  function transferAndCapture(respond: (req: TestRequest) => void): string {
    store.transfer('AC-PREMIUM-0001', 100).subscribe({ error: () => undefined });
    const req = httpMock.expectOne(
      `${environment.apiUrl}/transactions/transfer`,
    );
    const key = req.request.headers.get('X-Idempotency-Key')!;
    respond(req);
    return key;
  }

  describe('idempotency key', () => {
    it('un fallo de RED (status 0) conserva la key para el reintento manual', () => {
      const key1 = transferAndCapture((req) =>
        req.error(new ProgressEvent('error')),
      );
      const key2 = transferAndCapture((req) => req.flush(makeTx()));

      expect(key2).toBe(key1);
    });

    it('un rechazo de negocio (status != 0) descarta la key', () => {
      const key1 = transferAndCapture((req) =>
        req.flush(
          { message: 'Fondos insuficientes' },
          { status: 422, statusText: 'Unprocessable Entity' },
        ),
      );
      const key2 = transferAndCapture((req) => req.flush(makeTx()));

      expect(key2).not.toBe(key1);
    });

    it('tras un éxito, el siguiente intento usa una key nueva', () => {
      const key1 = transferAndCapture((req) => req.flush(makeTx()));
      const key2 = transferAndCapture((req) => req.flush(makeTx()));

      expect(key2).not.toBe(key1);
    });

    it('startNewAttempt() fuerza una key nueva aunque el intento previo fuera de red', () => {
      const key1 = transferAndCapture((req) =>
        req.error(new ProgressEvent('error')),
      );
      store.startNewAttempt();
      const key2 = transferAndCapture((req) => req.flush(makeTx()));

      expect(key2).not.toBe(key1);
    });
  });

  describe('mensajes de error', () => {
    it('status 0 → mensaje de conexión', () => {
      transferAndCapture((req) => req.error(new ProgressEvent('error')));
      expect(store.error()).toContain('No se pudo conectar con el servidor');
    });

    it('message como array → usa el primer elemento', () => {
      transferAndCapture((req) =>
        req.flush(
          { message: ['amount must be positive', 'otra cosa'] },
          { status: 400, statusText: 'Bad Request' },
        ),
      );
      expect(store.error()).toBe('amount must be positive');
    });

    it('sin message legible → mensaje genérico', () => {
      transferAndCapture((req) =>
        req.flush({}, { status: 500, statusText: 'Server Error' }),
      );
      expect(store.error()).toBe('No se pudo completar la transferencia.');
    });
  });

  it('reset() limpia error y lastResult', () => {
    transferAndCapture((req) => req.flush(makeTx()));
    expect(store.lastResult()).not.toBeNull();

    store.reset();
    expect(store.lastResult()).toBeNull();
    expect(store.error()).toBeNull();
  });
});
