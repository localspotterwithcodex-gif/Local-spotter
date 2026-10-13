import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const port = process.env.PORT || 4000;
  const apiPrefix = process.env.API_PREFIX || '/api/v1';

  // Global Prefix
  app.setGlobalPrefix(apiPrefix);

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // CORS Configuration — supports a comma-separated list so both local dev
  // (http://localhost:3000) and the deployed Vercel frontend origin can be
  // allowed at the same time, e.g.:
  //   CORS_ORIGIN=http://localhost:3000,https://local-spotter-ten.vercel.app
  const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim());
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // Swagger OpenAPI Setup
  const config = new DocumentBuilder()
    .setTitle('LocalSpotter REST API')
    .setDescription('LocalSpotter.nl MVP Backend API for Web, Android, and iOS applications')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(`${apiPrefix.replace(/^\//, '')}/docs`, app, document);

  await app.listen(port);
  console.log(`🚀 LocalSpotter Backend API running on: http://localhost:${port}${apiPrefix}`);
  console.log(`📚 Swagger OpenAPI Documentation: http://localhost:${port}${apiPrefix}/docs`);
}

bootstrap();
