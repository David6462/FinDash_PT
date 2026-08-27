import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthUser } from '../../modules/auth/strategies/jwt.strategy.js';

/**
 * Inyecta el `request.user` que dejó la JwtStrategy en un parámetro del handler.
 *
 * @example
 *   @Get('me')
 *   @UseGuards(JwtAuthGuard)
 *   getMe(@CurrentUser() user: AuthUser) { ... }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser => {
    const request = context
      .switchToHttp()
      .getRequest<{ user: AuthUser }>();
    return request.user;
  },
);
