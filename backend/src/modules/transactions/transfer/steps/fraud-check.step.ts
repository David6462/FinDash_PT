import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FRAUD_CHECKER } from '../../fraud-check/fraud-check.interface.js';
import type { FraudChecker } from '../../fraud-check/fraud-check.interface.js';
import { FraudCheckTimeoutException } from '../../exceptions/index.js';
import { TransferContext } from '../transfer-context.interface.js';

/**
 * Corre el antifraude con un límite de tiempo: Promise.race entre el check y un
 * timeout de FRAUD_CHECK_TIMEOUT_MS (ConfigService). Si gana el timeout, lanza
 * FraudCheckTimeoutException.
 */
@Injectable()
export class FraudCheckStep {
  constructor(
    @Inject(FRAUD_CHECKER)
    private readonly fraudChecker: FraudChecker,
    private readonly configService: ConfigService,
  ) {}

  async execute(context: TransferContext): Promise<void> {
    const timeoutMs = Number(
      this.configService.getOrThrow<string>('FRAUD_CHECK_TIMEOUT_MS'),
    );

    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_resolve, reject) => {
      timeoutHandle = setTimeout(
        () => reject(new FraudCheckTimeoutException()),
        timeoutMs,
      );
    });

    try {
      context.fraudApproved = await Promise.race([
        this.fraudChecker.check(context.amount),
        timeout,
      ]);
    } finally {
      // timeoutHandle siempre está asignado acá (el executor de la Promise
      // corre sincrónicamente); clearTimeout(undefined) sería no-op igual.
      clearTimeout(timeoutHandle);
    }
  }
}
