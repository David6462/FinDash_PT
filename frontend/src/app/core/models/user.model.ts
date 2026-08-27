import { AccountRole } from './enums';

/**
 * Espejo de `backend/src/modules/users/entities/user.entity.ts`.
 * `passwordHash` nunca sale del backend (@Exclude), así que no está aquí.
 */
export interface User {
  id: string;
  documentNumber: string;
  fullName: string;
  role: AccountRole;
  avatarUrl: string | null;
  createdAt: string;
}

/**
 * Lo que el frontend realmente conoce del usuario tras el login: el backend no
 * expone un endpoint `/users/me`, y el JWT solo transporta `sub` / `documentNumber`
 * / `role`. Es el shape que persiste el AuthStore.
 */
export interface SessionUser {
  id: string;
  documentNumber: string;
  role: AccountRole;
}
