import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
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
});
