import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountStatus } from '../../../../common/enums/index.js';
import { Account } from '../../../accounts/entities/account.entity.js';
import {
  AccountNotFoundException,
  InactiveAccountException,
  SelfTransferException,
} from '../../exceptions/index.js';
import { TransferContext } from '../transfer-context.interface.js';

/**
 * Carga y valida ambas cuentas.
 *
 * Simplificación consciente: la cuenta ORIGEN se resuelve por el usuario
 * autenticado, asumiendo que cada User tiene exactamente UNA Account (así lo
 * arma el seed). Si el negocio pide poder elegir la cuenta origen, la extensión
 * es directa: agregar `sourceAccountNumber` al TransferDto y buscar por él
 * validando que `owner.id === requestingUserId` — el resto del paso no cambia.
 */
@Injectable()
export class LoadAndValidateAccountsStep {
  constructor(
    @InjectRepository(Account)
    private readonly accounts: Repository<Account>,
  ) {}

  async execute(context: TransferContext): Promise<void> {
    const sourceAccount = await this.accounts.findOne({
      where: { owner: { id: context.requestingUserId } },
      relations: { owner: true },
    });
    if (!sourceAccount) {
      throw new AccountNotFoundException(
        'El usuario autenticado no tiene una cuenta de origen',
      );
    }

    const destinationAccount = await this.accounts.findOne({
      where: { accountNumber: context.dto.destinationAccountNumber },
    });
    if (!destinationAccount) {
      throw new AccountNotFoundException('La cuenta de destino no existe');
    }

    if (sourceAccount.id === destinationAccount.id) {
      throw new SelfTransferException();
    }

    // Defensa en profundidad: la query ya filtra por owner, pero lo dejamos
    // explícito por si esa query cambia en el futuro.
    if (sourceAccount.owner.id !== context.requestingUserId) {
      throw new AccountNotFoundException(
        'El usuario autenticado no tiene una cuenta de origen',
      );
    }

    if (sourceAccount.status !== AccountStatus.ACTIVE) {
      throw new InactiveAccountException('La cuenta de origen no está activa');
    }
    if (destinationAccount.status !== AccountStatus.ACTIVE) {
      throw new InactiveAccountException('La cuenta de destino no está activa');
    }

    context.sourceAccount = sourceAccount;
    context.destinationAccount = destinationAccount;
  }
}
