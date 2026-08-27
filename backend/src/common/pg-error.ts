/** Código de error de Postgres para violación de constraint UNIQUE. */
export const PG_UNIQUE_VIOLATION = '23505';

/** True si `error` es un error de Postgres por violación de UNIQUE (23505). */
export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === PG_UNIQUE_VIOLATION
  );
}
