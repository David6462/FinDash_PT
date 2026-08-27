import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  buildPaginatedResult,
  PaginatedResult,
} from '../../common/dto/paginated-result.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { Account } from '../accounts/entities/account.entity.js';
import { Transaction } from './entities/transaction.entity.js';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionsRepository: Repository<Transaction>,
    @InjectRepository(Account)
    private readonly accountsRepository: Repository<Account>,
  ) {}

  /**
   * Historial de movimientos del usuario autenticado: transacciones donde
   * alguna de sus cuentas es origen O destino. Paginado, más recientes primero.
   */
  async findMyMovements(
    userId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<Transaction>> {
    const { page, limit } = query;

    const ownAccounts = await this.accountsRepository.find({
      where: { owner: { id: userId } },
      select: { id: true },
    });
    const accountIds = ownAccounts.map((account) => account.id);

    if (accountIds.length === 0) {
      return buildPaginatedResult([], 0, page, limit);
    }

    const [data, total] = await this.transactionsRepository
      .createQueryBuilder('tx')
      .leftJoinAndSelect('tx.sourceAccount', 'sourceAccount')
      .leftJoinAndSelect('tx.destinationAccount', 'destinationAccount')
      .where(
        '(tx.sourceAccountId IN (:...accountIds) OR tx.destinationAccountId IN (:...accountIds))',
        { accountIds },
      )
      .orderBy('tx.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return buildPaginatedResult(data, total, page, limit);
  }
}
