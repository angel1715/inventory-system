import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { NestExpressApplication } from "@nestjs/platform-express";
import { join } from "path";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });

  const configService = app.get(ConfigService);

  // =========================
  // SECURITY
  // =========================
  app.use(
    helmet({
      crossOriginResourcePolicy: false,
    }),
  );

  // =========================
  // STATIC FILES (FIXED)
  // =========================
  app.useStaticAssets(join(process.cwd(), "uploads"), {
    prefix: "/uploads",
  });

  // =========================
  // GLOBAL PREFIX
  // =========================
  app.setGlobalPrefix("api");



  const frontendUrl = configService.get<string>("FRONTEND_URL") || "https://inventory-system-theta-flax.vercel.app";
  // =========================
  // CORS
  // =========================
  app.enableCors({
    
    origin: [
      frontendUrl,
      /\.vercel\.app$/ 
    ] as (string | RegExp)[],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  // =========================
  // VALIDATION
  // =========================
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // =========================
  // PORT
  // =========================
  const port = configService.get<number>("PORT") || 3001;

  await app.listen(port);

  console.log(`🚀 Server running on port ${port}`);
}

bootstrap();