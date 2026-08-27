import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccountRole } from '../../../common/enums/index.js';
import { ROLES_KEY } from '../../../common/decorators/roles.decorator.js';
import type { AuthUser } from '../strategies/jwt.strategy.js';

/**
 * Autoriza por rol. Se usa DESPUÉS de JwtAuthGuard (necesita `request.user`).
 *
 * - Si el endpoint no declara @Roles(...), no bloquea (deja pasar a cualquier
 *   usuario ya autenticado).
 * - Si declara roles, exige que `request.user.role` esté entre ellos.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<AccountRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = request.user;

    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        'No tenés permisos para acceder a este recurso',
      );
    }

    return true;
  }
}
