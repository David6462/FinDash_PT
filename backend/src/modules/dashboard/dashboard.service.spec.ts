import { jest } from '@jest/globals';
import { AccountTier } from '../../common/enums/index.js';
import { DashboardService } from './dashboard.service.js';

function buildService(overrides: {
  volumeRow?: { totalVolume: string } | undefined;
  failedCount?: number;
  tierRows?: Array<{
    tier: string;
    totalVolume: string;
    transactionCount: string;
  }>;
}) {
  const qb: Record<string, jest.Mock> = {};
  for (const method of [
    'select',
    'addSelect',
    'where',
    'innerJoin',
    'groupBy',
  ]) {
    qb[method] = jest.fn(() => qb);
  }
  qb.getRawOne = jest.fn(async () => overrides.volumeRow);
  qb.getCount = jest.fn(async () => overrides.failedCount ?? 0);
  qb.getRawMany = jest.fn(async () => overrides.tierRows ?? []);

  const repo = { createQueryBuilder: jest.fn(() => qb) };
  return { service: new DashboardService(repo as never), qb };
}

describe('DashboardService.getKpis', () => {
  it('devuelve el volumen (formateado a 2 decimales) y el conteo de rechazadas', async () => {
    const { service } = buildService({
      volumeRow: { totalVolume: '1150.75' },
      failedCount: 5,
    });

    await expect(service.getKpis()).resolves.toEqual({
      totalVolumeTransacted: '1150.75',
      failedTransactionsCount: 5,
    });
  });

  it('sin transacciones COMPLETED devuelve 0.00', async () => {
    const { service } = buildService({
      volumeRow: { totalVolume: '0' },
      failedCount: 0,
    });

    await expect(service.getKpis()).resolves.toEqual({
      totalVolumeTransacted: '0.00',
      failedTransactionsCount: 0,
    });
  });
});

describe('DashboardService.getVolumeByTier', () => {
  it('siempre devuelve los 3 tiers, en orden, con los ausentes en cero', async () => {
    const { service } = buildService({
      tierRows: [
        { tier: 'BASIC', totalVolume: '300.00', transactionCount: '2' },
        { tier: 'PREMIUM', totalVolume: '500.00', transactionCount: '1' },
      ],
    });

    await expect(service.getVolumeByTier()).resolves.toEqual([
      { tier: AccountTier.BASIC, totalVolume: '300.00', transactionCount: 2 },
      { tier: AccountTier.PREMIUM, totalVolume: '500.00', transactionCount: 1 },
      { tier: AccountTier.CORPORATE, totalVolume: '0.00', transactionCount: 0 },
    ]);
  });

  it('agrupa por sourceAccount.tier vía JOIN y filtra COMPLETED', async () => {
    const { service, qb } = buildService({ tierRows: [] });

    await service.getVolumeByTier();

    expect(qb.innerJoin).toHaveBeenCalledWith(
      'tx.sourceAccount',
      'sourceAccount',
    );
    expect(qb.groupBy).toHaveBeenCalledWith('sourceAccount.tier');
  });
});
