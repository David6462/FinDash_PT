import { GenerateAuthorizationCodeStep } from './generate-authorization-code.step.js';
import type { TransferContext } from '../transfer-context.interface.js';

describe('GenerateAuthorizationCodeStep', () => {
  const step = new GenerateAuthorizationCodeStep();

  it('genera un código con formato AUTH-XXXXXXXX (8 hex en mayúscula)', () => {
    const context = {} as TransferContext;

    step.execute(context);

    expect(context.authorizationCode).toMatch(/^AUTH-[0-9A-F]{8}$/);
  });

  it('genera códigos distintos en llamadas sucesivas', () => {
    const a = {} as TransferContext;
    const b = {} as TransferContext;
    step.execute(a);
    step.execute(b);
    expect(a.authorizationCode).not.toBe(b.authorizationCode);
  });
});
