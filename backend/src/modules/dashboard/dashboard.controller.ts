import { Controller, Get, UseGuards } from '@nestjs/common';
import { AccountRole } from '../../common/enums/index.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { DashboardService } from './dashboard.service.js';
import {
  DashboardKpisDto,
  VolumeByTierItemDto,
} from './dto/dashboard-kpis.dto.js';

/** Métricas para Admin. Todos los endpoints exigen rol ADMIN. */
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AccountRole.ADMIN)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('kpis')
  getKpis(): Promise<DashboardKpisDto> {
    return this.dashboardService.getKpis();
  }

  @Get('volume-by-tier')
  getVolumeByTier(): Promise<VolumeByTierItemDto[]> {
    return this.dashboardService.getVolumeByTier();
  }
}
