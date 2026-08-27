import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Activa la JwtStrategy. Sin lógica adicional: si el token falta, está mal
 * firmado o expiró, Passport responde 401 automáticamente.
 *
 * El constructor vacío es a propósito: sin él, Nest hereda los paramtypes del
 * mixin AuthGuard (que pide AuthModuleOptions) pero pierde su marca @Optional,
 * y falla al resolver dependencias en cualquier módulo que use el guard.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor() {
    super();
  }
}
