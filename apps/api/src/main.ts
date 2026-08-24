import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const port = process.env.API_PORT ? parseInt(process.env.API_PORT, 10) : 4000;

  app.enableCors({
    origin: process.env.APP_URL || 'http://localhost:3000',
    credentials: true,
  });

  await app.listen(port);
  console.log(`🚀 [OpenSIO API] Démarré sur http://localhost:${port}`);
}

void bootstrap();
