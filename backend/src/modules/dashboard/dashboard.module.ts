import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { Transaction } from '../transactions/entities/transaction.entity.js';
import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';

/** Métricas agregadas para el panel de Admin (RF-07, RF-08). Solo lectura. */
@Module({
  imports: [TypeOrmModule.forFeature([Transaction]), AuthModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
