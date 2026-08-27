import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity.js';

/**
 * Módulo de dominio de usuarios. Por ahora solo registra la entidad.
 * Controladores y servicios (incluyendo auth) llegan en etapas posteriores.
 */
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  exports: [TypeOrmModule],
})
export class UsersModule {}
