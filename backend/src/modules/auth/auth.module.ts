import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { SignOptions } from 'jsonwebtoken';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { RolesGuard } from './guards/roles.guard.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';

@Module({
  imports: [
    PassportModule,
    TypeOrmModule.forFeature([User]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          // El valor viene del .env como string ("1h", "3600", "7d"...); el
          // tipo de jsonwebtoken es más estrecho (StringValue | number).
          expiresIn: config.get<string>(
            'JWT_EXPIRES_IN',
            '1h',
          ) as SignOptions['expiresIn'],
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, RolesGuard],
  // Se exportan para que otros módulos puedan proteger sus endpoints con los
  // guards (JwtAuthGuard depende de que la JwtStrategy esté registrada).
  exports: [JwtStrategy, PassportModule, RolesGuard],
})
export class AuthModule {}
