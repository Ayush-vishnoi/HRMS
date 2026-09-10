import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    // Let the browser read Content-Disposition on file downloads (documents,
    // receipts) so the frontend can name the saved file correctly.
    exposedHeaders: ['Content-Disposition', 'Content-Length'],
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix('api');

  const port = process.env.BACKEND_PORT || 4000;
  await app.listen(port);
  console.log(`HRMS Backend running on http://localhost:${port}/api`);
}
bootstrap();
