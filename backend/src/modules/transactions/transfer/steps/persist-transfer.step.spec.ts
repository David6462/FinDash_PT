import { jest } from '@jest/globals';
import { Decimal } from 'decimal.js';
import { TransactionStatus } from '../../../../common/enums/index.js';
import { Account } from '../../../accounts/entities/account.entity.js';
import { InsufficientFundsException } from '../../exceptions/index.js';
import { PersistTransferStep } from './persist-transfer.step.js';
import type { TransferContext } from '../transfer-context.interface.js';

interface MockOptions {
  sourceBalance?: string;
  destinationBalance?: string;
  txSaveError?: unknown;
  winnerTransaction?: unknown;
}

function buildMocks(options: MockOptions = {}) {
  const {
    sourceBalance = '1000.00',
    destinationBalance = '500.00',
    txSaveError,
    winnerTransaction,
  } = options;

  const sourceAccount = { id: 'aaa-source', balance: sourceBalance };
  const destinationAccount = { id: 'bbb-dest', balance: destinationBalance };
  const accountsById: Record<string, unknown> = {
    'aaa-source': sourceAccount,
    'bbb-dest': destinationAccount,
  };

  const accountsRepo = {
    findOne: jest.fn(async ({ where: { id } }: { where: { id: string } }) => ({
      ...(accountsById[id] as object),
    })),
    save: jest.fn(async (rows: unknown) => rows),
  };
  const savedTx: unknown[] = [];
  const transactionsRepo = {
    create: jest.fn((x: unknown) => x),
    save: jest.fn(async (tx: Record<string, unknown>) => {
      if (txSaveError) throw txSaveError;
      const persisted = { id: 'tx-new', ...tx };
      savedTx.push(persisted);
      return persisted;
    }),
  };

  const manager = {
    getRepository: jest.fn((entity: unknown) =>
      entity === Account ? accountsRepo : transactionsRepo,
    ),
  };
  const queryRunner = {
    connect: jest.fn(async () => undefined),
    startTransaction: jest.fn(async () => undefined),
    commitTransaction: jest.fn(async () => undefined),
    rollbackTransaction: jest.fn(async () => undefined),
    release: jest.fn(async () => undefined),
    manager,
  };
  const outerTransactionsRepo = {
    findOne: jest.fn(async () => winnerTransaction ?? null),
  };
  const dataSource = {
    createQueryRunner: jest.fn(() => queryRunner),
    getRepository: jest.fn(() => outerTransactionsRepo),
  };

  return {
    dataSource,
    queryRunner,
    accountsRepo,
    transactionsRepo,
    outerTransactionsRepo,
    savedTx,
  };
}

function context(): TransferContext {
  return {
    dto: { destinationAccountNumber: 'AC-DST', amount: 100 },
    idempotencyKey: 'key-1',
    requestingUserId: 'user-1',
    amount: new Decimal('100'),
    sourceAccount: { id: 'aaa-source', tier: 'BASIC' },
    destinationAccount: { id: 'bbb-dest' },
    commission: new Decimal('2'),
    totalDebited: new Decimal('102'),
    authorizationCode: 'AUTH-ABCD1234',
  } as unknown as TransferContext;
}

describe('PersistTransferStep', () => {
  it('descuenta totalDebited del origen, suma amount (sin comisión) al destino y commitea', async () => {
    const m = buildMocks({ sourceBalance: '1000.00', destinationBalance: '500.00' });
    const step = new PersistTransferStep(m.dataSource as never);

    const result = await step.execute(context());

    const savedAccounts = m.accountsRepo.save.mock.calls[0][0] as Array<{
      id: string;
      balance: string;
    }>;
    const source = savedAccounts.find((a) => a.id === 'aaa-source')!;
    const destination = savedAccounts.find((a) => a.id === 'bbb-dest')!;
    expect(source.balance).toBe('898.00'); // 1000 - 102
    expect(destination.balance).toBe('600.00'); // 500 + 100 (sin comisión)

    const savedTx = m.transactionsRepo.save.mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(savedTx).toMatchObject({
      amount: '100.00',
      commissionCharged: '2.00',
      totalDebited: '102.00',
      status: TransactionStatus.COMPLETED,
      authorizationCode: 'AUTH-ABCD1234',
      idempotencyKey: 'key-1',
    });
    expect(result).toMatchObject({ id: 'tx-new' });
    expect(m.queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
    expect(m.queryRunner.release).toHaveBeenCalledTimes(1);
  });

  it('bloquea las cuentas en orden de id consistente (menor primero)', async () => {
    const m = buildMocks();
    const step = new PersistTransferStep(m.dataSource as never);

    await step.execute(context());

    const lockedIds = m.accountsRepo.findOne.mock.calls.map(
      (call) => (call[0] as { where: { id: string } }).where.id,
    );
    expect(lockedIds).toEqual(['aaa-source', 'bbb-dest']);
    expect(m.accountsRepo.findOne.mock.calls[0][0]).toMatchObject({
      lock: { mode: 'pessimistic_write' },
    });
  });

  it('re-valida el saldo BAJO EL LOCK y lanza InsufficientFundsException + rollback si ya no alcanza', async () => {
    // Saldo cambió a 50 (otra transferencia concurrente) -> no cubre 102.
    const m = buildMocks({ sourceBalance: '50.00' });
    const step = new PersistTransferStep(m.dataSource as never);

    await expect(step.execute(context())).rejects.toBeInstanceOf(
      InsufficientFundsException,
    );
    expect(m.queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(m.queryRunner.commitTransaction).not.toHaveBeenCalled();
    expect(m.queryRunner.release).toHaveBeenCalledTimes(1);
  });

  it('ante violación de UNIQUE de idempotencyKey: rollback, busca la Transaction ganadora y la devuelve (no propaga el error)', async () => {
    const winner = { id: 'tx-winner', idempotencyKey: 'key-1' };
    const m = buildMocks({
      txSaveError: { code: '23505' },
      winnerTransaction: winner,
    });
    const step = new PersistTransferStep(m.dataSource as never);

    const result = await step.execute(context());

    expect(result).toBe(winner);
    expect(m.queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(m.queryRunner.commitTransaction).not.toHaveBeenCalled();
    expect(m.queryRunner.release).toHaveBeenCalledTimes(1);
  });

  it('ante violación de UNIQUE pero SIN Transaction ganadora encontrada: rollback y re-lanza el error original', async () => {
    const uniqueError = { code: '23505' };
    const m = buildMocks({
      txSaveError: uniqueError,
      // winnerTransaction ausente -> outerTransactionsRepo.findOne devuelve null
    });
    const step = new PersistTransferStep(m.dataSource as never);

    await expect(step.execute(context())).rejects.toBe(uniqueError);
    expect(m.outerTransactionsRepo.findOne).toHaveBeenCalledTimes(1);
    expect(m.queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(m.queryRunner.commitTransaction).not.toHaveBeenCalled();
    expect(m.queryRunner.release).toHaveBeenCalledTimes(1);
  });

  it('propaga el error si NO es una violación de UNIQUE', async () => {
    const m = buildMocks({ txSaveError: new Error('boom') });
    const step = new PersistTransferStep(m.dataSource as never);

    await expect(step.execute(context())).rejects.toThrow('boom');
    expect(m.queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(m.queryRunner.release).toHaveBeenCalledTimes(1);
  });

  it('hace rollback + release si una de las cuentas no aparece al bloquear', async () => {
    const m = buildMocks();
    m.accountsRepo.findOne.mockResolvedValue(null);
    const step = new PersistTransferStep(m.dataSource as never);

    await expect(step.execute(context())).rejects.toThrow(/no encontrada al bloquear/);
    expect(m.queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(m.queryRunner.release).toHaveBeenCalledTimes(1);
  });
});
