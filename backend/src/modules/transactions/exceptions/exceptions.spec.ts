import { HttpStatus } from '@nestjs/common';
import {
  AccountNotFoundException,
  FraudCheckTimeoutException,
  InactiveAccountException,
  InsufficientFundsException,
  isTransferDomainException,
  RejectionReason,
  SelfTransferException,
} from './index.js';

describe('Excepciones de dominio de transferencias', () => {
  const cases = [
    [
      new InsufficientFundsException(),
      HttpStatus.BAD_REQUEST,
      RejectionReason.INSUFFICIENT_FUNDS,
    ],
    [
      new InactiveAccountException(),
      HttpStatus.BAD_REQUEST,
      RejectionReason.INACTIVE_ACCOUNT,
    ],
    [
      new SelfTransferException(),
      HttpStatus.BAD_REQUEST,
      RejectionReason.SELF_TRANSFER,
    ],
    [
      new AccountNotFoundException(),
      HttpStatus.NOT_FOUND,
      RejectionReason.ACCOUNT_NOT_FOUND,
    ],
    [
      new FraudCheckTimeoutException(),
      HttpStatus.GATEWAY_TIMEOUT,
      RejectionReason.FRAUD_CHECK_TIMEOUT,
    ],
  ] as const;

  it.each(cases)(
    '%s -> status y rejectionReason correctos',
    (exception, status, rejectionReason) => {
      expect(exception.getStatus()).toBe(status);
      expect(exception.rejectionReason).toBe(rejectionReason);
      expect(isTransferDomainException(exception)).toBe(true);
    },
  );

  it('isTransferDomainException es false para errores ajenos', () => {
    expect(isTransferDomainException(new Error('otro'))).toBe(false);
    expect(isTransferDomainException(undefined)).toBe(false);
  });
});
