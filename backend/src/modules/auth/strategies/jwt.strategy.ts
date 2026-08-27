import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AccountRole } from '../../../common/enums/index.js';

/** Forma del payload que firma AuthService.login(). */
export interface JwtPayload {
  sub: string;
  documentNumber: string;
  role: AccountRole;
}

/**
 * Objeto que queda disponible como `request.user` en cualquier endpoint
 * protegido por JwtAuthGuard.
 */
export interface AuthUser {
  userId: string;
  documentNumber: string;
  role: AccountRole;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      // Authorization: Bearer <token>
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  /**
   * Passport ya validó la firma y la expiración antes de llamar aquí.
   * El role viene del token: el RolesGuard no necesita tocar la DB.
   */
  validate(payload: JwtPayload): AuthUser {
    return {
      userId: payload.sub,
      documentNumber: payload.documentNumber,
      role: payload.role,
    };
  }
}
