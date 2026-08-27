import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';

export const IDEMPOTENCY_KEY_HEADER = 'x-idempotency-key';

/**
 * Lógica de extracción, separada del decorador para poder testearla directo.
 * El header es OBLIGATORIO: si falta o viene vacío, 400 explícito.
 */
export function extractIdempotencyKey(context: ExecutionContext): string {
  const request = context
    .switchToHttp()
    .getRequest<{ headers: Record<string, string | string[] | undefined> }>();

  const raw = request.headers[IDEMPOTENCY_KEY_HEADER];
  const key = Array.isArray(raw) ? raw[0] : raw;

  if (!key || key.trim() === '') {
    throw new BadRequestException('X-Idempotency-Key header es requerido');
  }

  return key.trim();
}

/**
 * @example
 *   transfer(@IdempotencyKey() key: string, @Body() dto: TransferDto) { ... }
 */
export const IdempotencyKey = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string =>
    extractIdempotencyKey(context),
);
