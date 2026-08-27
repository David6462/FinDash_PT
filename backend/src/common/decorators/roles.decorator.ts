import { SetMetadata } from '@nestjs/common';
import { AccountRole } from '../enums/index.js';

/** Clave de metadata bajo la que se guardan los roles requeridos por un endpoint. */
export const ROLES_KEY = 'roles';

/**
 * Marca un endpoint (o un controller entero) como restringido a ciertos roles.
 * El RolesGuard lee esta metadata con Reflector y la compara contra
 * `request.user.role`. Si el decorador no está presente, el guard NO bloquea.
 *
 * @example
 *   @Roles(AccountRole.ADMIN)
 *   @Get('admin-only')
 */
export const Roles = (...roles: AccountRole[]) => SetMetadata(ROLES_KEY, roles);
