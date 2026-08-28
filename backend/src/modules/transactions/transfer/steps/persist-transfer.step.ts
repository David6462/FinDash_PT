import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TransactionStatus } from '../../../../common/enums/index.js';
import { toDecimal, toMoneyString } from '../../../../common/money.js';
import { isUniqueViolation } from '../../../../common/pg-error.js';
import { Account } from '../../../accounts/entities/account.entity.js';
import { Transaction } from '../../entities/transaction.entity.js';
import { InsufficientFundsException } from '../../exceptions/index.js';
import { TransferContext } from '../transfer-context.interface.js';

/**
 * Único paso que toca la DB con una transacción real. Bloquea ambas cuentas
 * (pessimistic_write) en orden consistente, re-valida el saldo bajo lock,
 * mueve los saldos e inserta la Transaction COMPLETED. Todo dentro de una
 * transacción de DB con commit/rollback y release garantizado.
 */
@Injectable()
export class PersistTransferStep {
  constructor(private readonly dataSource: DataSource) {}

  async execute(context: TransferContext): Promise<Transaction> {
    const sourceId = context.sourceAccount!.id;
    const destinationId = context.destinationAccount!.id;

    // Orden consistente de adquisición de locks: si dos transferencias cruzadas
    // (A->B y B->A) compiten por las mismas dos cuentas, ambas las bloquean en
    // el mismo orden y no hay deadlock.
    //
    // Los id son UUID (string). Comparador relacional puro (por code units), NO
    // localeCompare: el orden tiene que ser idéntico corra donde corra el proceso
    // (local, CI, contenedor de Cloud Run). localeCompare depende del locale /
    // versión de ICU / Node del entorno; la comparación relacional de strings
    // está fijada por el estándar de JS y no lee ningún dato de configuración.
    // Es un invariante de seguridad de concurrencia: debe sostenerse siempre.
    // (Sonar S2871 exige comparador explícito; un .sort() a secas también ordena
    // por string pero de forma implícita.)
    const lockOrder = [sourceId, destinationId].sort((a, b) =>
      a < b ? -1 : a > b ? 1 : 0,
    );

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const accountsRepo = queryRunner.manager.getRepository(Account);

      const lockedById = new Map<string, Account>();
      for (const id of lockOrder) {
        const account = await accountsRepo.findOne({
          where: { id },
          lock: { mode: 'pessimistic_write' },
        });
        if (!account) {
          // No debería pasar: las cuentas ya se cargaron y validaron antes.
          throw new Error(`Cuenta ${id} no encontrada al bloquear`);
        }
        lockedById.set(id, account);
      }

      const source = lockedById.get(sourceId)!;
      const destination = lockedById.get(destinationId)!;

      // Re-validación bajo lock: el saldo pudo cambiar mientras esperábamos el
      // antifraude si hubo otra transferencia concurrente.
      const sourceBalance = toDecimal(source.balance);
      if (sourceBalance.lessThan(context.totalDebited!)) {
        throw new InsufficientFundsException();
      }

      source.balance = toMoneyString(sourceBalance.minus(context.totalDebited!));
      destination.balance = toMoneyString(
        toDecimal(destination.balance).plus(context.amount),
      );
      await accountsRepo.save([source, destination]);

      const transactionsRepo = queryRunner.manager.getRepository(Transaction);
      const saved = await transactionsRepo.save(
        transactionsRepo.create({
          sourceAccount: { id: sourceId },
          destinationAccount: { id: destinationId },
          amount: toMoneyString(context.amount),
          commissionCharged: toMoneyString(context.commission!),
          totalDebited: toMoneyString(context.totalDebited!),
          status: TransactionStatus.COMPLETED,
          authorizationCode: context.authorizationCode!,
          idempotencyKey: context.idempotencyKey,
          rejectionReason: null,
        }),
      );

      await queryRunner.commitTransaction();
      return saved;
    } catch (error) {
      await queryRunner.rollbackTransaction();

      // Carrera de idempotencia: otra request con la misma key ganó el INSERT
      // mientras esta corría. Devolvemos esa Transaction, no propagamos el
      // error de constraint.
      if (isUniqueViolation(error)) {
        const winner = await this.dataSource.getRepository(Transaction).findOne({
          where: { idempotencyKey: context.idempotencyKey },
          relations: { sourceAccount: true, destinationAccount: true },
        });
        if (winner) {
          return winner;
        }
      }

      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
