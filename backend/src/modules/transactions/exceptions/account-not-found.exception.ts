import { NotFoundException } from '@nestjs/common';
import { RejectionReason } from './rejection-reason.enum.js';

/** La cuenta origen o destino no existe. HTTP 404. */
export class AccountNotFoundException extends NotFoundException {
  readonly rejectionReason = RejectionReason.ACCOUNT_NOT_FOUND;

  constructor(message = 'La cuenta indicada no existe') {
    super(message);
  }
}
