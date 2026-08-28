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

    // DB_HOST se pasa TAL CUAL al driver `pg`, sin validación ni transformación:
    //  - desarrollo local: un host de red normal ("localhost", una IP, etc.).
    //  - Cloud Run + Cloud SQL: un socket Unix, p. ej.
    //    "/cloudsql/findash-pt:us-central1:findash-db". `pg` detecta el "/"
    //    inicial y conecta por socket (`<host>/.s.PGSQL.<port>`), ignorando el
    //    host de red. Por eso NO agregar aquí ninguna validación de formato de IP.
    host: config.get<string>('DB_HOST'),
    // Con socket Unix el puerto solo forma parte del nombre del archivo del
    // socket; 5432 (el default de Cloud SQL) es el valor correcto y DB_PORT
    // puede quedar sin definir.
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
