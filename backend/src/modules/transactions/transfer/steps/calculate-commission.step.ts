import { Injectable } from '@nestjs/common';
import { CommissionStrategyFactory } from '../../commission/commission-strategy.factory.js';
import { TransferContext } from '../transfer-context.interface.js';

/**
 * Calcula la comisión según el tier de la cuenta ORIGEN y el totalDebited
 * (monto + comisión). Toda la aritmética con Decimal.
 */
@Injectable()
export class CalculateCommissionStep {
  constructor(
    private readonly commissionStrategyFactory: CommissionStrategyFactory,
  ) {}

  execute(context: TransferContext): void {
    const strategy = this.commissionStrategyFactory.getStrategy(
      context.sourceAccount!.tier,
    );

    const commission = strategy.calculate(context.amount);

    context.commission = commission;
    context.totalDebited = context.amount.plus(commission);
  }
}
