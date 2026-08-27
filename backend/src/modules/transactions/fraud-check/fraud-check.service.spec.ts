import { Decimal } from 'decimal.js';
import { FraudCheckService } from './fraud-check.service.js';

describe('FraudCheckService', () => {
  it('aprueba (resuelve true) tras la latencia configurada', async () => {
    const service = new FraudCheckService({ minMs: 5, maxMs: 10 });
    await expect(service.check(new Decimal(100))).resolves.toBe(true);
  });

  it('respeta el rango de delay inyectado (no usa el default de 1-10s)', async () => {
    const service = new FraudCheckService({ minMs: 0, maxMs: 0 });
    const start = Date.now();
    await service.check(new Decimal(1));
    expect(Date.now() - start).toBeLessThan(200);
  });

  it('expone un DEFAULT_DELAY de 1000-10000ms', () => {
    expect(FraudCheckService.DEFAULT_DELAY).toEqual({
      minMs: 1000,
      maxMs: 10000,
    });
  });

  it('sin config explícita usa DEFAULT_DELAY', () => {
    const service = new FraudCheckService();
    expect(
      (service as unknown as { delay: unknown }).delay,
    ).toBe(FraudCheckService.DEFAULT_DELAY);
  });
});
