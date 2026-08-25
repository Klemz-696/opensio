import { NestFactory } from '@nestjs/core';
import { WsAdapter } from '@nestjs/platform-ws';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { validateEnv } from './config/env.validation';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap(): Promise<void> {
  const env = validateEnv();
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useWebSocketAdapter(new WsAdapter(app));
  app.setGlobalPrefix('api/v1');

  app.enableCors({
    origin: env.APP_URL,
    credentials: true,
  });

  await app.listen(env.API_PORT);
  console.log(`🚀 [OpenSIO API] Démarré sur http://localhost:${env.API_PORT}/api/v1`);
}

void bootstrap();
