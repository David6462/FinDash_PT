import { jest } from '@jest/globals';
import { Logger } from '@nestjs/common';
import { Decimal } from 'decimal.js';
import { TransactionStatus } from '../../../common/enums/index.js';
import {
  AccountNotFoundException,
  InsufficientFundsException,
  RejectionReason,
} from '../exceptions/index.js';
import { TransferOrchestratorUseCase } from './transfer-orchestrator.use-case.js';
import type { TransferContext } from './transfer-context.interface.js';

function buildOrchestrator() {
  const calls: string[] = [];
  const spy = (name: string, impl?: (ctx: TransferContext) => unknown) =>
    jest.fn(async (ctx: TransferContext) => {
      calls.push(name);
      return impl?.(ctx);
    });

  const idempotencyCheckStep = { execute: spy('idempotency') };
  const loadAndValidateAccountsStep = {
    execute: spy('loadAccounts', (ctx) => {
      ctx.sourceAccount = { id: 'src' } as never;
      ctx.destinationAccount = { id: 'dst' } as never;
    }),
  };
  const calculateCommissionStep = {
    execute: spy('commission', (ctx) => {
      ctx.commission = new Decimal('2');
      ctx.totalDebited = new Decimal('102');
    }),
  };
  const validateFundsStep = { execute: spy('validateFunds') };
  const fraudCheckStep = { execute: spy('fraud') };
  const generateAuthorizationCodeStep = { execute: spy('authCode') };
  const persistTransferStep = {
    execute: spy('persist', () => ({ id: 'tx-completed' })),
  };
  const transactions = { create: jest.fn((x) => x), save: jest.fn(async (x) => x) };

  const orchestrator = new TransferOrchestratorUseCase(
    idempotencyCheckStep as never,
    loadAndValidateAccountsStep as never,
    calculateCommissionStep as never,
    validateFundsStep as never,
    fraudCheckStep as never,
    generateAuthorizationCodeStep as never,
    persistTransferStep as never,
    transactions as never,
  );

  return {
    orchestrator,
    calls,
    steps: {
      idempotencyCheckStep,
      loadAndValidateAccountsStep,
      calculateCommissionStep,
      validateFundsStep,
      fraudCheckStep,
      generateAuthorizationCodeStep,
      persistTransferStep,
    },
    transactions,
  };
}

const input = {
  dto: { destinationAccountNumber: 'AC-DST', amount: 100 },
  idempotencyKey: 'key-1',
  requestingUserId: 'user-1',
};

describe('TransferOrchestratorUseCase', () => {
  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  it('ejecuta los pasos en el orden correcto en el caso feliz', async () => {
    const { orchestrator, calls } = buildOrchestrator();

    const result = await orchestrator.execute(input);

    expect(calls).toEqual([
      'idempotency',
      'loadAccounts',
      'commission',
      'validateFunds',
      'fraud',
      'authCode',
      'persist',
    ]);
    expect(result).toEqual({ id: 'tx-completed' });
  });

  it('corta tras IdempotencyCheckStep y devuelve la Transaction previa sin ejecutar el resto', async () => {
    const { orchestrator, calls, steps } = buildOrchestrator();
    const existing = { id: 'tx-existing' };
    steps.idempotencyCheckStep.execute.mockImplementation(
      async (ctx: TransferContext) => {
        calls.push('idempotency');
        ctx.existingTransaction = existing as never;
      },
    );

    const result = await orchestrator.execute(input);

    expect(result).toBe(existing);
    expect(calls).toEqual(['idempotency']);
    expect(steps.loadAndValidateAccountsStep.execute).not.toHaveBeenCalled();
    expect(steps.persistTransferStep.execute).not.toHaveBeenCalled();
  });

  it('si un paso intermedio lanza, no ejecuta los siguientes', async () => {
    const { orchestrator, calls, steps } = buildOrchestrator();
    // ValidateFundsStep es sincrónico: el mock también, para que el throw se
    // propague igual que en producción (no como promise rechazada suelta).
    steps.validateFundsStep.execute.mockImplementation(() => {
      calls.push('validateFunds');
      throw new InsufficientFundsException();
    });

    await expect(orchestrator.execute(input)).rejects.toBeInstanceOf(
      InsufficientFundsException,
    );

    expect(calls).toEqual([
      'idempotency',
      'loadAccounts',
      'commission',
      'validateFunds',
    ]);
    expect(steps.fraudCheckStep.execute).not.toHaveBeenCalled();
    expect(steps.persistTransferStep.execute).not.toHaveBeenCalled();
  });

  it('ante una excepción de dominio: persiste una Transaction REJECTED con el rejectionReason y re-lanza', async () => {
    const { orchestrator, transactions, steps } = buildOrchestrator();
    steps.validateFundsStep.execute.mockImplementation(() => {
      throw new InsufficientFundsException();
    });

    await expect(orchestrator.execute(input)).rejects.toBeInstanceOf(
      InsufficientFundsException,
    );

    expect(transactions.save).toHaveBeenCalledTimes(1);
    expect(transactions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: TransactionStatus.REJECTED,
        rejectionReason: RejectionReason.INSUFFICIENT_FUNDS,
        idempotencyKey: 'key-1',
        authorizationCode: null,
      }),
    );
  });

  it('si falla ANTES de resolver las cuentas, persiste REJECTED con FKs y montos en null/0', async () => {
    const { orchestrator, transactions, steps } = buildOrchestrator();
    steps.loadAndValidateAccountsStep.execute.mockImplementation(async () => {
      throw new AccountNotFoundException('La cuenta de destino no existe');
    });

    await expect(orchestrator.execute(input)).rejects.toBeInstanceOf(
      AccountNotFoundException,
    );

    expect(transactions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceAccount: null,
        destinationAccount: null,
        commissionCharged: '0.00',
        totalDebited: '100.00', // == amount, sin comisión calculada
        status: TransactionStatus.REJECTED,
        rejectionReason: RejectionReason.ACCOUNT_NOT_FOUND,
      }),
    );
  });

  it('ante un error NO de dominio: NO persiste REJECTED, solo re-lanza', async () => {
    const { orchestrator, transactions, steps } = buildOrchestrator();
    steps.fraudCheckStep.execute.mockImplementation(async () => {
      throw new Error('error inesperado de infraestructura');
    });

    await expect(orchestrator.execute(input)).rejects.toThrow(
      'error inesperado de infraestructura',
    );
    expect(transactions.save).not.toHaveBeenCalled();
  });

  it.each([
    ['carrera de idempotencyKey (23505)', { code: '23505' }],
    ['cualquier otro fallo del INSERT', new Error('db caído')],
  ])(
    'si el INSERT de la REJECTED falla por %s, NO enmascara la excepción de dominio original',
    async (_label, saveError) => {
      const { orchestrator, transactions, steps } = buildOrchestrator();
      steps.validateFundsStep.execute.mockImplementation(() => {
        throw new InsufficientFundsException();
      });
      transactions.save.mockRejectedValue(saveError);

      await expect(orchestrator.execute(input)).rejects.toBeInstanceOf(
        InsufficientFundsException,
      );
    },
  );
});
