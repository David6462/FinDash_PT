import { BadRequestException } from '@nestjs/common';
import { RejectionReason } from './rejection-reason.enum.js';

/** La cuenta origen o destino no está ACTIVE (está BLOCKED). HTTP 400. */
export class InactiveAccountException extends BadRequestException {
  readonly rejectionReason = RejectionReason.INACTIVE_ACCOUNT;

  constructor(message = 'La cuenta indicada no está activa') {
    super(message);
  }
}
