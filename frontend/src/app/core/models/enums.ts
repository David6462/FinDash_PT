/**
 * Union types de string (NO enums de TS) para que matcheen directo con el JSON
 * del backend sin conversión. Espejan `backend/src/common/enums/*`.
 */
export type AccountRole = 'ADMIN' | 'CLIENT';

export type AccountTier = 'BASIC' | 'PREMIUM' | 'CORPORATE';

export type AccountStatus = 'ACTIVE' | 'BLOCKED';

export type TransactionStatus = 'COMPLETED' | 'REJECTED';
