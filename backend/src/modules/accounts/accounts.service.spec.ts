import { jest } from '@jest/globals';
import { AccountStatus } from '../../common/enums/index.js';
import { AccountsService } from './accounts.service.js';
import type { ListAccountsQueryDto } from './dto/list-accounts-query.dto.js';

function mockQueryBuilder(result: [unknown[], number]) {
  const qb: Record<string, jest.Mock> = {};
  for (const method of [
    'leftJoinAndSelect',
    'orderBy',
    'skip',
    'take',
    'andWhere',
  ]) {
    qb[method] = jest.fn(() => qb);
  }
  qb.getManyAndCount = jest.fn(async () => result);
  return qb;
}

function buildService(result: [unknown[], number]) {
  const qb = mockQueryBuilder(result);
  const repo = {
    createQueryBuilder: jest.fn(() => qb),
    find: jest.fn(),
  };
  return { service: new AccountsService(repo as never), repo, qb };
}

const baseQuery: ListAccountsQueryDto = { page: 1, limit: 10 };

describe('AccountsService.listAccounts', () => {
  it('pagina a nivel SQL: skip = (page-1)*limit, take = limit', async () => {
    const { service, qb } = buildService([[], 0]);

    await service.listAccounts({ ...baseQuery, page: 3, limit: 10 });

    expect(qb.skip).toHaveBeenCalledWith(20);
    expect(qb.take).toHaveBeenCalledWith(10);
  });

  it('arma la respuesta paginada estándar { data, meta }', async () => {
    const rows = [{ id: 'a' }, { id: 'b' }];
    const { service } = buildService([rows, 25]);

    const result = await service.listAccounts({ page: 2, limit: 10 });

    expect(result).toEqual({
      data: rows,
      meta: { page: 2, limit: 10, total: 25, totalPages: 3 },
    });
  });

  it('filtra por documentNumber con ILIKE parcial (JOIN a owner)', async () => {
    const { service, qb } = buildService([[], 0]);

    await service.listAccounts({ ...baseQuery, documentNumber: 'CC-CLI' });

    expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('account.owner', 'owner');
    expect(qb.andWhere).toHaveBeenCalledWith(
      'owner.documentNumber ILIKE :documentNumber',
      { documentNumber: '%CC-CLI%' },
    );
  });

  it('filtra por status exacto', async () => {
    const { service, qb } = buildService([[], 0]);

    await service.listAccounts({ ...baseQuery, status: AccountStatus.BLOCKED });

    expect(qb.andWhere).toHaveBeenCalledWith('account.status = :status', {
      status: AccountStatus.BLOCKED,
    });
  });

  it('sin filtros no agrega ningún andWhere', async () => {
    const { service, qb } = buildService([[], 0]);

    await service.listAccounts(baseQuery);

    expect(qb.andWhere).not.toHaveBeenCalled();
  });

  it('totalPages es 0 cuando no hay resultados', async () => {
    const { service } = buildService([[], 0]);
    const result = await service.listAccounts(baseQuery);
    expect(result.meta.totalPages).toBe(0);
  });
});
