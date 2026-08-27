import { ConfigService } from '@nestjs/config';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';

/**
 * Construye las opciones de conexión de TypeORM a partir de las variables
 * de entorno (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME) leídas
 * mediante ConfigService.
 */
export function buildTypeOrmOptions(
  config: ConfigService,
): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    host: config.get<string>('DB_HOST'),
    port: Number(config.get<string>('DB_PORT') ?? 5432),
    username: config.get<string>('DB_USER'),
    password: config.get<string>('DB_PASSWORD'),
    database: config.get<string>('DB_NAME'),

    // Carga automáticamente toda entidad registrada con
    // TypeOrmModule.forFeature() en los módulos de dominio.
    autoLoadEntities: true,

    // ⚠️ synchronize: true hace que TypeORM cree/altere las tablas a partir
    // de las entidades en cada arranque. Es cómodo para esta prueba técnica
    // de un día, pero NUNCA debe usarse en producción real: puede provocar
    // pérdida de datos ante cambios de esquema. En producción se usarían
    // migraciones versionadas. Decisión consciente para esta etapa.
    synchronize: true,
  };
}
