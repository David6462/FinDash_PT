import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { AccountStore } from '../../../../core/account/account.store';
import { Account, Transaction } from '../../../../core/models';
import { TransferStore } from '../transfer.store';
import { TransferFormComponent } from './transfer-form.component';

function makeTx(): Transaction {
  return {
    id: 'tx-1',
    sourceAccount: null,
    destinationAccount: null,
    amount: '10.00',
    commissionCharged: '0.10',
    totalDebited: '10.10',
    status: 'COMPLETED',
    rejectionReason: null,
    idempotencyKey: 'k',
    authorizationCode: 'AUTH',
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

const myAccount: Account = {
  id: 'a1',
  accountNumber: 'AC-BASIC-0001',
  balance: '500.00',
  tier: 'BASIC',
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('TransferFormComponent', () => {
  let fixture: ComponentFixture<TransferFormComponent>;
  let component: TransferFormComponent;

  const loading = signal(false);
  const error = signal<string | null>(null);
  const lastResult = signal<Transaction | null>(null);

  let storeStub: {
    loading: typeof loading;
    error: typeof error;
    lastResult: typeof lastResult;
    reset: jasmine.Spy;
    startNewAttempt: jasmine.Spy;
    transfer: jasmine.Spy;
  };

  beforeEach(async () => {
    loading.set(false);
    error.set(null);
    lastResult.set(null);

    storeStub = {
      loading,
      error,
      lastResult,
      reset: jasmine.createSpy('reset'),
      startNewAttempt: jasmine.createSpy('startNewAttempt'),
      transfer: jasmine.createSpy('transfer').and.returnValue(of(makeTx())),
    };

    await TestBed.configureTestingModule({
      imports: [TransferFormComponent],
      providers: [
        { provide: TransferStore, useValue: storeStub },
        { provide: AccountStore, useValue: { myAccount: signal(myAccount) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TransferFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('validación del monto', () => {
    it('es requerido', () => {
      component.form.controls.amount.setValue(null);
      expect(component.form.controls.amount.hasError('required')).toBe(true);
    });

    it('debe ser positivo (min 0.01)', () => {
      component.form.controls.amount.setValue(0);
      expect(component.form.controls.amount.hasError('min')).toBe(true);
    });

    it('rechaza más de 2 decimales', () => {
      component.form.controls.amount.setValue(10.123);
      expect(component.form.controls.amount.hasError('maxTwoDecimals')).toBe(true);
    });

    it('acepta un monto válido con cuenta destino', () => {
      component.form.setValue({
        destinationAccountNumber: 'AC-PREMIUM-0001',
        amount: 10.12,
      });
      expect(component.form.valid).toBe(true);
    });
  });

  it('el botón queda deshabilitado mientras el store está loading', () => {
    component.form.setValue({
      destinationAccountNumber: 'AC-PREMIUM-0001',
      amount: 10,
    });
    fixture.detectChanges();
    const button: HTMLButtonElement =
      fixture.nativeElement.querySelector('button[type="submit"]');
    expect(button.disabled).toBe(false);

    loading.set(true);
    fixture.detectChanges();
    expect(button.disabled).toBe(true);
  });

  it('muestra el mensaje de error del store', () => {
    error.set('Fondos insuficientes');
    fixture.detectChanges();
    const alert: HTMLElement =
      fixture.nativeElement.querySelector('.alert--error');
    expect(alert.textContent).toContain('Fondos insuficientes');
  });

  it('pide una nueva idempotency key al montar y ante cada cambio del form', () => {
    // ngOnInit ya llamó startNewAttempt una vez.
    expect(storeStub.startNewAttempt).toHaveBeenCalledTimes(1);

    component.form.controls.amount.setValue(25);
    expect(storeStub.startNewAttempt.calls.count()).toBeGreaterThan(1);
  });

  it('submit() con form válido llama a store.transfer con los valores crudos', () => {
    component.form.setValue({
      destinationAccountNumber: 'AC-PREMIUM-0001',
      amount: 42.5,
    });
    component.submit();
    expect(storeStub.transfer).toHaveBeenCalledWith('AC-PREMIUM-0001', 42.5);
  });

  it('submit() no deja escapar el error del store a la consola', () => {
    storeStub.transfer.and.returnValue(throwError(() => new Error('boom')));
    component.form.setValue({
      destinationAccountNumber: 'AC-PREMIUM-0001',
      amount: 10,
    });
    expect(() => component.submit()).not.toThrow();
  });

  it('submit() con form inválido no llama a store.transfer', () => {
    component.form.controls.destinationAccountNumber.setValue('');
    component.form.controls.amount.setValue(null);
    component.submit();
    expect(storeStub.transfer).not.toHaveBeenCalled();
  });
});
