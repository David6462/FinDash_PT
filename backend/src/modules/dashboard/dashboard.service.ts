import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Decimal } from 'decimal.js';
import { Repository } from 'typeorm';
import { AccountTier, TransactionStatus } from '../../common/enums/index.js';
import { toMoneyString } from '../../common/money.js';
import { Transaction } from '../transactions/entities/transaction.entity.js';
import {
  DashboardKpisDto,
  VolumeByTierItemDto,
} from './dto/dashboard-kpis.dto.js';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionsRepository: Repository<Transaction>,
  ) {}

  /**
   * KPIs globales. La suma y el conteo se hacen a nivel SQL (SUM/COUNT), no
   * trayendo filas a memoria: con volumen real esto no escalaría.
   */
  async getKpis(): Promise<DashboardKpisDto> {
    const volumeRow = await this.transactionsRepository
      .createQueryBuilder('tx')
      .select('COALESCE(SUM(tx.amount), 0)', 'totalVolume')
      .where('tx.status = :status', { status: TransactionStatus.COMPLETED })
      .getRawOne<{ totalVolume: string }>();

    const failedTransactionsCount = await this.transactionsRepository
      .createQueryBuilder('tx')
      .where('tx.status = :status', { status: TransactionStatus.REJECTED })
      .getCount();

    return {
      // SUM ya viene sumado desde SQL; decimal.js solo formatea a 2 decimales.
      totalVolumeTransacted: toMoneyString(new Decimal(volumeRow?.totalVolume ?? 0)),
      failedTransactionsCount,
    };
  }

  /**
   * Volumen de transacciones COMPLETED agrupado por el tier de la cuenta
   * ORIGEN. Siempre devuelve los 3 tiers (los ausentes en 0), para que el
   * frontend no tenga que manejar tiers faltantes al pintar el gráfico.
   */
  async getVolumeByTier(): Promise<VolumeByTierItemDto[]> {
    const rows = await this.transactionsRepository
      .createQueryBuilder('tx')
      .innerJoin('tx.sourceAccount', 'sourceAccount')
      .select('sourceAccount.tier', 'tier')
      .addSelect('COALESCE(SUM(tx.amount), 0)', 'totalVolume')
      .addSelect('COUNT(tx.id)', 'transactionCount')
      .where('tx.status = :status', { status: TransactionStatus.COMPLETED })
      .groupBy('sourceAccount.tier')
      .getRawMany<{
        tier: AccountTier;
        totalVolume: string;
        transactionCount: string;
      }>();

    const byTier = new Map(rows.map((row) => [row.tier, row]));

    return Object.values(AccountTier).map((tier) => {
      const row = byTier.get(tier);
      return {
        tier,
        totalVolume: toMoneyString(new Decimal(row?.totalVolume ?? 0)),
        transactionCount: row ? Number(row.transactionCount) : 0,
      };
    });
  }
}
