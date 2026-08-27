import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { TransferContext } from '../transfer-context.interface.js';

/** Genera el código de autorización de la transferencia: `AUTH-XXXXXXXX`. */
@Injectable()
export class GenerateAuthorizationCodeStep {
  execute(context: TransferContext): void {
    context.authorizationCode = `AUTH-${randomUUID().slice(0, 8).toUpperCase()}`;
  }
}
