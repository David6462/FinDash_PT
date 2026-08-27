import {
  ClassSerializerInterceptor,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * Configuración global de la app (pipes, interceptores). Se aplica tanto en
 * el arranque real (main.ts) como en los tests e2e, para que ambos ejerciten
 * exactamente el mismo comportamiento.
 */
export function configureApp(app: INestApplication): void {
  // CORS para el frontend (Angular dev server y, más adelante, el dominio de
  // producción). `CORS_ORIGIN` acepta una lista separada por comas; si no se
  // define, se permite el dev server local.
  const corsOrigin = process.env.CORS_ORIGIN?.split(',').map((o) => o.trim()) ?? [
    'http://localhost:4200',
  ];
  app.enableCors({ origin: corsOrigin });

  app.useGlobalPipes(
    new ValidationPipe({
      // whitelist: descarta en silencio cualquier propiedad que el DTO no
      // declare. Es lo que hace que un `role` colado en POST /auth/register se
      // ignore sin más (el DTO ya no tiene ese campo). No usamos
      // forbidNonWhitelisted a propósito: preferimos ignorar campos extra a
      // devolver 400 por ellos.
      whitelist: true,
      transform: true,
    }),
  );

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
}
