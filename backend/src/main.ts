import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);

  // El puerto lo inyecta el entorno: Cloud Run setea PORT y el contenedor DEBE
  // escuchar ahí. El 3000 es solo el fallback para desarrollo local (cuando
  // PORT no está definido); nunca un puerto hardcodeado de despliegue.
  const configService = app.get(ConfigService);
  const port = Number(configService.get('PORT')) || 3000;
  await app.listen(port);
}
bootstrap();
