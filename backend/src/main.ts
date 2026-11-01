import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { requestContext } from './common/http/request-context.middleware';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true, // the Stripe webhook signature is computed over the exact raw request body
  });
  app.disable('x-powered-by');
  app.use(requestContext);
  app.enableShutdownHooks(); // finish in-flight requests and close the DB pool on SIGTERM (deploys)
  // Behind a reverse proxy / the Next.js rewrite, trust X-Forwarded-For so
  // rate limiting sees the real client IP. TRUST_PROXY = number of proxy hops
  // in front of the app (Vercel rewrite + Render load balancer = 2).
  if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || 1);
  else if (process.env.NODE_ENV === 'production') {
    console.warn('TRUST_PROXY is not set: every visitor behind the proxy shares one IP for rate limiting. See docs/ENVIRONMENT_VARIABLES.md.');
  }
  if (process.env.NODE_ENV === 'production' && !process.env.ENCRYPTION_KEY) {
    console.warn('ENCRYPTION_KEY is not set: admins cannot set up two-step verification, so the admin portal stays locked.');
  }

  const port = process.env.PORT || 4000;
  const apiPrefix = process.env.API_PREFIX || '/api/v1';

  // Global Prefix
  app.setGlobalPrefix(apiPrefix);

  // Global Validation Pipe
  app.useGlobalFilters(new PrismaExceptionFilter());
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

  // Swagger OpenAPI Setup — off in production (it maps every admin and internal route) unless SWAGGER_ENABLED=true.
  const swaggerEnabled = process.env.NODE_ENV !== 'production' || process.env.SWAGGER_ENABLED === 'true';
  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('LocalSpotter REST API')
      .setDescription('LocalSpotter.nl MVP Backend API for Web, Android, and iOS applications')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup(`${apiPrefix.replace(/^\//, '')}/docs`, app, document);
  }

  await app.listen(port);
  console.log(`🚀 LocalSpotter Backend API running on: http://localhost:${port}${apiPrefix}`);
  if (swaggerEnabled) console.log(`📚 Swagger OpenAPI Documentation: http://localhost:${port}${apiPrefix}/docs`);
}

bootstrap();
