import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  buildPaginatedResult,
  PaginatedResult,
} from '../../common/dto/paginated-result.js';
import { Account } from './entities/account.entity.js';
import { ListAccountsQueryDto } from './dto/list-accounts-query.dto.js';

@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(Account)
    private readonly accountsRepository: Repository<Account>,
  ) {}

  /** Cuentas del usuario autenticado. */
  findByOwner(userId: string): Promise<Account[]> {
    return this.accountsRepository.find({ where: { owner: { id: userId } } });
  }

  /**
   * Listado paginado para ADMIN. QueryBuilder (no findAndCount) porque:
   * - se necesita el JOIN con User para poder filtrar por documentNumber, y
   * - la paginación (skip/take) se hace a nivel de SQL, no en memoria.
   */
  async listAccounts(
    query: ListAccountsQueryDto,
  ): Promise<PaginatedResult<Account>> {
    const { page, limit, documentNumber, status } = query;

    const qb = this.accountsRepository
      .createQueryBuilder('account')
      .leftJoinAndSelect('account.owner', 'owner')
      .orderBy('account.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (documentNumber) {
      qb.andWhere('owner.documentNumber ILIKE :documentNumber', {
        documentNumber: `%${documentNumber}%`,
      });
    }

    if (status) {
      qb.andWhere('account.status = :status', { status });
    }

    const [data, total] = await qb.getManyAndCount();
    return buildPaginatedResult(data, total, page, limit);
  }
}
