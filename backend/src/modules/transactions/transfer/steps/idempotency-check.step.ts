import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '../../entities/transaction.entity.js';
import { TransferContext } from '../transfer-context.interface.js';

/**
 * Busca una Transaction previa con la misma idempotencyKey. Si existe, la deja
 * en `context.existingTransaction` y el orquestador corta ahí devolviéndola tal
 * cual (sin re-ejecutar nada más).
 */
@Injectable()
export class IdempotencyCheckStep {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactions: Repository<Transaction>,
  ) {}

  async execute(context: TransferContext): Promise<void> {
    const existing = await this.transactions.findOne({
      where: { idempotencyKey: context.idempotencyKey },
      relations: { sourceAccount: true, destinationAccount: true },
    });

    if (existing) {
      context.existingTransaction = existing;
    }
  }
}
