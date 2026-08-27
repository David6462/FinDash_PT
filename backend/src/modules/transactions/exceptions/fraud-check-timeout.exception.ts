import { GatewayTimeoutException } from '@nestjs/common';
import { RejectionReason } from './rejection-reason.enum.js';

/**
 * El servicio antifraude no respondió dentro de FRAUD_CHECK_TIMEOUT_MS.
 *
 * HTTP 504 (Gateway Timeout): fue una dependencia downstream la que no
 * respondió a tiempo, no el cliente el que tardó en mandar la request (eso
 * sería 408).
 */
export class FraudCheckTimeoutException extends GatewayTimeoutException {
  readonly rejectionReason = RejectionReason.FRAUD_CHECK_TIMEOUT;

  constructor(message = 'El chequeo antifraude no respondió a tiempo') {
    super(message);
  }
}
