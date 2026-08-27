import { BadRequestException } from '@nestjs/common';
import { RejectionReason } from './rejection-reason.enum.js';

/** El saldo de la cuenta origen no cubre monto + comisión. HTTP 400. */
export class InsufficientFundsException extends BadRequestException {
  readonly rejectionReason = RejectionReason.INSUFFICIENT_FUNDS;

  constructor(message = 'Fondos insuficientes para cubrir el monto y la comisión') {
    super(message);
  }
}
