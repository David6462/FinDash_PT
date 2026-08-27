import { BadRequestException, ExecutionContext } from '@nestjs/common';
import { extractIdempotencyKey } from './idempotency-key.decorator.js';

const ctxWithHeaders = (
  headers: Record<string, string | string[] | undefined>,
): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ headers }) }),
  }) as unknown as ExecutionContext;

describe('extractIdempotencyKey', () => {
  it('devuelve el valor del header x-idempotency-key', () => {
    expect(
      extractIdempotencyKey(ctxWithHeaders({ 'x-idempotency-key': 'abc-123' })),
    ).toBe('abc-123');
  });

  it('recorta espacios', () => {
    expect(
      extractIdempotencyKey(ctxWithHeaders({ 'x-idempotency-key': '  k1  ' })),
    ).toBe('k1');
  });

  it('toma el primero si el header llega repetido (array)', () => {
    expect(
      extractIdempotencyKey(
        ctxWithHeaders({ 'x-idempotency-key': ['k1', 'k2'] }),
      ),
    ).toBe('k1');
  });

  it('lanza BadRequestException con mensaje explícito si falta', () => {
    expect(() => extractIdempotencyKey(ctxWithHeaders({}))).toThrow(
      new BadRequestException('X-Idempotency-Key header es requerido'),
    );
  });

  it('lanza BadRequestException si viene vacío o solo espacios', () => {
    expect(() =>
      extractIdempotencyKey(ctxWithHeaders({ 'x-idempotency-key': '   ' })),
    ).toThrow(BadRequestException);
  });
});
