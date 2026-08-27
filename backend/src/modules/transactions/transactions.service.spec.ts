import { jest } from '@jest/globals';
import { TransactionsService } from './transactions.service.js';

function mockQueryBuilder(result: [unknown[], number]) {
  const qb: Record<string, jest.Mock> = {};
  for (const method of [
    'leftJoinAndSelect',
    'where',
    'orderBy',
    'skip',
    'take',
  ]) {
    qb[method] = jest.fn(() => qb);
  }
  qb.getManyAndCount = jest.fn(async () => result);
  return qb;
}

function buildService(
  ownAccounts: Array<{ id: string }>,
  txResult: [unknown[], number] = [[], 0],
) {
  const qb = mockQueryBuilder(txResult);
  const transactionsRepo = { createQueryBuilder: jest.fn(() => qb) };
  const accountsRepo = { find: jest.fn(async () => ownAccounts) };
  return {
    service: new TransactionsService(
      transactionsRepo as never,
      accountsRepo as never,
    ),
    qb,
    transactionsRepo,
  };
}

describe('TransactionsService.findMyMovements', () => {
  it('devuelve resultado vacío sin tocar la tabla de transacciones si el usuario no tiene cuentas', async () => {
    const { service, transactionsRepo } = buildService([]);

    const result = await service.findMyMovements('user-1', {
      page: 1,
      limit: 10,
    });

    expect(transactionsRepo.createQueryBuilder).not.toHaveBeenCalled();
    expect(result).toEqual({
      data: [],
      meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
    });
  });

  it('filtra por las cuentas del usuario en AMBAS columnas (origen o destino) y ordena por createdAt DESC', async () => {
    const rows = [{ id: 'tx-1' }];
    const { service, qb } = buildService(
      [{ id: 'acc-1' }, { id: 'acc-2' }],
      [rows, 1],
    );

    const result = await service.findMyMovements('user-1', {
      page: 2,
      limit: 5,
    });

    expect(qb.where).toHaveBeenCalledWith(
      '(tx.sourceAccountId IN (:...accountIds) OR tx.destinationAccountId IN (:...accountIds))',
      { accountIds: ['acc-1', 'acc-2'] },
    );
    expect(qb.orderBy).toHaveBeenCalledWith('tx.createdAt', 'DESC');
    expect(qb.skip).toHaveBeenCalledWith(5);
    expect(qb.take).toHaveBeenCalledWith(5);
    expect(result).toEqual({
      data: rows,
      meta: { page: 2, limit: 5, total: 1, totalPages: 1 },
    });
  });
});
