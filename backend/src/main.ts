import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { NestExpressApplication } from "@nestjs/platform-express";
import { join } from "path";

// Los filtros de "hoy", los reportes y los cierres usan la hora del servidor.
// En la nube suele ser UTC, así que se fija la hora de República Dominicana
// (sin horario de verano). Si defines TZ en el entorno, se respeta.
if (!process.env.TZ) {
  process.env.TZ = "America/Santo_Domingo";
}

const cleanOrigin = (value: string) => value.trim().replace(/\/+$/, "");

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  const logger = new Logger("Bootstrap");
  const configService = app.get(ConfigService);
  const isProduction = process.env.NODE_ENV === "production";

  // =========================
  // PROXY (hosting en la nube)
  // =========================
  // Detrás de un proxy, sin esto todas las peticiones parecen venir de la misma IP
  // y el límite de peticiones (Throttler) bloquearía a todos los usuarios a la vez.
  // TRUST_PROXY = número de proxies delante del servidor (normalmente 1).
  const proxyHops = Number(configService.get("TRUST_PROXY") ?? 0);
  if (proxyHops > 0) {
    app.set("trust proxy", proxyHops);
  }

  // =========================
  // SECURITY
  // =========================
  app.use(
    helmet({
      crossOriginResourcePolicy: false,
    }),
  );

  // =========================
  // STATIC FILES
  // =========================
  // Si quitas UploadModule (las fotos van directo a Cloudinary), borra también este bloque.
  app.useStaticAssets(join(process.cwd(), "uploads"), {
    prefix: "/uploads",
  });

  // =========================
  // GLOBAL PREFIX
  // =========================
  app.setGlobalPrefix("api");

  // =========================
  // CORS
  // =========================
  // Solo orígenes explícitos. Para previews de Vercel u otros dominios, agrégalos
  // separados por coma en CORS_ORIGINS.
  const allowedOrigins = Array.from(
    new Set(
      [
        configService.get<string>("FRONTEND_URL") ||
          "https://inventory-system-theta-flax.vercel.app",
        ...(configService.get<string>("CORS_ORIGINS") ?? "").split(","),
        ...(isProduction ? [] : ["http://localhost:3000"]),
      ]
        .map(cleanOrigin)
        .filter(Boolean),
    ),
  );

  app.enableCors({
    origin: allowedOrigins,
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
  
  // Cierre ordenado en cada despliegue (cierra la conexión de Prisma)
  app.enableShutdownHooks();
  
  // =========================
  // PORT
  // =========================
  const port = configService.get<number>("PORT") || 3001;
  
  await app.listen(port);

  logger.log(`🚀 Server running on port ${port}`);
}

bootstrap();