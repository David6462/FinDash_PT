import { Decimal } from 'decimal.js';

/**
 * Helpers para manejar dinero sin floats.
 *
 * Las columnas `numeric` de Postgres llegan a la app como `string` (decisión
 * tomada al modelar las entidades). Toda la aritmética monetaria se hace con
 * `Decimal` de decimal.js; al escribir de vuelta a la entidad/DB se usa
 * `toFixed(2)` para dejar exactamente 2 decimales.
 */

/** Escala de la moneda: 2 decimales. */
export const MONEY_SCALE = 2;

/** Convierte un valor de entidad/DTO (string | number) a Decimal. */
export function toDecimal(value: string | number): Decimal {
  return new Decimal(value);
}

/** Serializa un Decimal a string con 2 decimales, listo para la entidad/DB. */
export function toMoneyString(value: Decimal): string {
  return value.toFixed(MONEY_SCALE);
}
