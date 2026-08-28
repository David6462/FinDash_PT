import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { Account, PaginationMeta, Transaction } from '../../../../core/models';
import { MovementsStore } from '../movements.store';
import { MovementsListComponent } from './movements-list.component';

const acc = (accountNumber: string): Account => ({
  id: accountNumber,
  accountNumber,
  balance: '0.00',
  tier: 'BASIC',
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00.000Z',
});

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-1',
    sourceAccount: null,
    destinationAccount: null,
    amount: '100.00',
    commissionCharged: '1.50',
    totalDebited: '101.50',
    status: 'COMPLETED',
    rejectionReason: null,
    idempotencyKey: 'k',
    authorizationCode: 'AUTH',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('MovementsListComponent', () => {
  let fixture: ComponentFixture<MovementsListComponent>;
  let component: MovementsListComponent;

  const movements = signal<Transaction[]>([]);
  const meta = signal<PaginationMeta | null>(null);
  const loadingSig = signal(false);
  const errorSig = signal<string | null>(null);
  const myAccountNumbers = signal<string[]>(['AC-MINE-1']);
  let loadSpy: jasmine.Spy;

  async function setup() {
    loadSpy = jasmine
      .createSpy('load')
      .and.returnValue(of({ data: movements(), meta: meta() }));

    await TestBed.configureTestingModule({
      imports: [MovementsListComponent],
      providers: [
        {
          provide: MovementsStore,
          useValue: {
            movements,
            meta,
            loading: loadingSig,
            error: errorSig,
            myAccountNumbers,
            load: loadSpy,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MovementsListComponent);
    component = fixture.componentInstance;
  }

  beforeEach(() => {
    movements.set([]);
    meta.set(null);
    loadingSig.set(false);
    errorSig.set(null);
    myAccountNumbers.set(['AC-MINE-1']);
  });

  it('carga la primera página al construirse', async () => {
    await setup();
    expect(loadSpy).toHaveBeenCalledWith(1);
  });

  it('un error en load() no se propaga', async () => {
    await setup();
    loadSpy.and.returnValue(throwError(() => new Error('boom')));
    expect(() => component.load(2)).not.toThrow();
  });

  describe('movimiento SALIENTE (la cuenta origen es mía)', () => {
    const tx = makeTx({
      sourceAccount: acc('AC-MINE-1'),
      destinationAccount: acc('AC-OTHER-9'),
    });

    it('direction() → "out" y la contraparte es la cuenta destino', async () => {
      await setup();
      expect(component.direction(tx)).toBe('out');
      expect(component.counterparty(tx)).toBe('AC-OTHER-9');
    });

    it('el monto se renderiza con signo "−" y muestra la comisión', async () => {
      await setup();
      movements.set([tx]);
      fixture.detectChanges();
      const text: string = fixture.nativeElement.textContent;
      expect(text).toContain('−100.00');

      const fee: HTMLElement | null =
        fixture.nativeElement.querySelector('.item__fee');
      expect(fee).not.toBeNull();
      expect(fee!.textContent).toContain('Comisión 1.50');
    });
  });

  describe('movimiento ENTRANTE (la cuenta destino es mía)', () => {
    const tx = makeTx({
      sourceAccount: acc('AC-OTHER-9'),
      destinationAccount: acc('AC-MINE-1'),
    });

    it('direction() → "in" y la contraparte es la cuenta origen', async () => {
      await setup();
      expect(component.direction(tx)).toBe('in');
      expect(component.counterparty(tx)).toBe('AC-OTHER-9');
    });

    it('el monto se renderiza con signo "+" y NO existe el elemento de comisión', async () => {
      await setup();
      movements.set([tx]);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('+100.00');
      // La comisión la paga solo quien envía: en un entrante el elemento no
      // debe existir en el DOM (no basta con que el valor sea 0).
      expect(fixture.nativeElement.querySelector('.item__fee')).toBeNull();
      expect(fixture.nativeElement.textContent).not.toContain('Comisión');
    });
  });

  it('si ninguna cuenta es mía → "unknown", cae a la cuenta destino y sin comisión', async () => {
    await setup();
    const tx = makeTx({
      sourceAccount: acc('AC-X'),
      destinationAccount: acc('AC-Y'),
    });
    expect(component.direction(tx)).toBe('unknown');
    expect(component.counterparty(tx)).toBe('AC-Y');

    movements.set([tx]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.item__fee')).toBeNull();
  });

  it('counterparty() devuelve "—" cuando falta la cuenta de contraparte', async () => {
    await setup();
    // Saliente sin cuenta destino (REJECTED que no llegó a destino).
    const outNoDest = makeTx({
      sourceAccount: acc('AC-MINE-1'),
      destinationAccount: null,
    });
    expect(component.counterparty(outNoDest)).toBe('—');

    // Entrante sin cuenta origen.
    const inNoSource = makeTx({
      sourceAccount: null,
      destinationAccount: acc('AC-MINE-1'),
    });
    expect(component.counterparty(inNoSource)).toBe('—');

    // Sin ninguna cuenta → unknown, cae a destino ausente.
    expect(component.counterparty(makeTx())).toBe('—');
  });
});
