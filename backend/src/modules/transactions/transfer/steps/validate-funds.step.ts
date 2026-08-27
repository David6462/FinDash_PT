import { Injectable } from '@nestjs/common';
import { toDecimal } from '../../../../common/money.js';
import { InsufficientFundsException } from '../../exceptions/index.js';
import { TransferContext } from '../transfer-context.interface.js';

/**
 * Chequeo de fondos previo al antifraude: el saldo de la cuenta origen debe
 * cubrir el totalDebited (monto + comisión).
 *
 * PersistTransferStep vuelve a validar bajo lock, porque entre este paso y la
 * persistencia puede haber pasado tiempo (antifraude) y otra transferencia
 * concurrente.
 */
@Injectable()
export class ValidateFundsStep {
  execute(context: TransferContext): void {
    const balance = toDecimal(context.sourceAccount!.balance);

    if (balance.lessThan(context.totalDebited!)) {
      throw new InsufficientFundsException();
    }
  }
}
