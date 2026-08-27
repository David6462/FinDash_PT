/**
 * Nivel de la cuenta. Define las reglas de comisión que se aplicarán en
 * etapas posteriores (orquestación de transferencias / RN de comisiones).
 *
 * IMPORTANTE: el nombre y los valores de este enum deben mantenerse estables.
 * Las reglas de negocio de comisión dependen directamente de estos literales.
 */
export enum AccountTier {
  BASIC = 'BASIC',
  PREMIUM = 'PREMIUM',
  CORPORATE = 'CORPORATE',
}
