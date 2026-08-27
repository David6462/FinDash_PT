import { BadRequestException } from '@nestjs/common';
import { RejectionReason } from './rejection-reason.enum.js';

/** Origen y destino son la misma cuenta. HTTP 400. */
export class SelfTransferException extends BadRequestException {
  readonly rejectionReason = RejectionReason.SELF_TRANSFER;

  constructor(message = 'No se puede transferir a la misma cuenta') {
    super(message);
  }
}
