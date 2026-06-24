import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { IoAdapter } from '@nestjs/platform-socket.io';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const helmet: () => import('express').RequestHandler = require('helmet');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pinoHttp: (opts?: Record<string, unknown>) => import('express').RequestHandler = require('pino-http');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pino: (opts?: Record<string, unknown>) => import('pino').Logger = require('pino');
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Helmet security headers
  app.use(helmet());

  // Pino HTTP logger
  app.use(
    pinoHttp({
      logger: pino({
        level: process.env.LOG_LEVEL ?? 'info',
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined,
      }),
    }),
  );

  // CORS
  app.enableCors({
    origin: [
      'https://funbreakseo.com',
      'https://admin.funbreakseo.com',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Socket.io adapter
  app.useWebSocketAdapter(new IoAdapter(app));

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('FunBreak SEO API')
    .setDescription('FunBreak SEO Platform REST API')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .addServer('http://localhost:4000', 'Local')
    .addServer('https://api.funbreakseo.com', 'Production')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = parseInt(process.env.PORT ?? '4000', 10);
  await app.listen(port);
  console.log(`FunBreak SEO API running on port ${port}`);
  console.log(`Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});
