/**
 * Estado operativo de la cuenta. Una cuenta BLOCKED no podrá operar
 * (validación que se implementa en la etapa de lógica de negocio).
 */
export enum AccountStatus {
  ACTIVE = 'ACTIVE',
  BLOCKED = 'BLOCKED',
}
