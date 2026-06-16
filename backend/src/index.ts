import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";

import { createAppRouter } from "./routes/index.js";

import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { requestLogger } from "./middleware/logger.js";
import { optionalAuth } from "./middleware/auth.js";

import { connectDatabase, query } from "./config/database-adapter.js";
import { AIService } from "./services/ai/AIService.js";
import { initializeLLMAgentService } from "./services/ai/agent/index.js";
import { registerAllTools } from "./services/ai/agent/toolRegistration.js";
import { parseResultCleanupService } from "./services/parseResultCleanupService.js";
import { loadThresholdsFromConfig } from "./services/ratioFactorValidator.js";
import { startBackupScheduler } from "./services/backupScheduler.js";

const app = express();
const PORT = process.env.PORT || 3000;
let isReady = false;

async function ensureReviewLogsTable(): Promise<void> {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS formula_review_logs (
        review_log_id  VARCHAR(36) PRIMARY KEY,
        version_id     VARCHAR(36) NOT NULL,
        reviewer_id    VARCHAR(36) NOT NULL,
        reviewer_name  VARCHAR(255) DEFAULT NULL,
        action         VARCHAR(20) NOT NULL,
        comment        TEXT DEFAULT NULL,
        created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_frl_version  (version_id),
        INDEX idx_frl_reviewer (reviewer_id),
        INDEX idx_frl_action   (action),
        FOREIGN KEY (version_id)  REFERENCES formula_versions(version_id) ON DELETE CASCADE,
        FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("[Startup] ✓ formula_review_logs 表已确认存在");
  } catch (error) {
    console.error("[Startup] ✗ 创建 formula_review_logs 表失败:", error);
  }
}

function setupApp(app: express.Application): void {
  configureMiddleware(app);
  configureRoutes(app);
  configureErrorHandling(app);
}

function initializeApp(): void {
  console.log("[Startup] Initializing TingStudio AI Agent Backend...");

  setupApp(app);
  startServer(app, PORT);

  connectDatabase()
    .then(async () => {
      await ensureReviewLogsTable();

      const aiService = new AIService();
      initializeLLMAgentService(aiService);

      registerAllTools();

      parseResultCleanupService.startScheduledCleanup();

      startBackupScheduler();

      loadThresholdsFromConfig().then(thresholds => {
        console.log(`[Startup] ✓ Ratio validation thresholds loaded: normal [${thresholds.normalLow}, ${thresholds.normalHigh}]`);
      }).catch(() => {
        console.log(`[Startup] ℹ Ratio validation thresholds: using defaults`);
      });

      isReady = true;

      console.log(`[Startup] ✓ Application initialized successfully`);
    })
    .catch(error => {
      console.error("[Startup] ✗ Failed to connect database:", error);
      process.exit(1);
    });
}

function configureMiddleware(app: express.Application): void {
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.use(
    cors({
      origin: process.env.CORS_ORIGIN?.split(',') || ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  );

  app.use(compression());

  if (process.env.NODE_ENV !== "test") {
    app.use(morgan("combined"));
  }

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  app.use(requestLogger);
  app.use(optionalAuth);

  app.use((req, _res, next) => {
    if (req.path.startsWith("/api/") && !isReady) {
      return _res.status(503).json({
        success: false,
        error: {
          message: "服务正在启动中，请稍后重试",
          code: "SERVICE_UNAVAILABLE",
        },
      });
    }
    next();
  });
}

function configureRoutes(app: express.Application): void {
  app.get("/health", (_req, res) => {
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: "2.0.0",
      service: "TingStudio AI Agent Backend",
    });
  });

  app.get("/api/status", (_req, res) => {
    res.json({
      success: true,
      data: {
        status: "running",
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        node_version: process.version,
        environment: process.env.NODE_ENV || "development",
      },
    });
  });

  const apiRouter = createAppRouter();
  app.use("/api", apiRouter);
}

function configureErrorHandling(app: express.Application): void {
  app.use(notFoundHandler);
  app.use(errorHandler);
}

function startServer(app: express.Application, port: number): void {
  app.listen(port, () => {
    console.log(`
╔═══════════════════════════════════════════════════════╗
║     TingStudio AI Agent Backend - Running            ║
║                                                       ║
║     🚀 Server: http://localhost:${port}                  ║
║     📊 API Docs: http://localhost:${port}/api/status     ║
║     ❤️  Health: http://localhost:${port}/health          ║
║                                                       ║
║     Environment: ${process.env.NODE_ENV || "development"}                    ║
║     Started at: ${new Date().toISOString()}   ║
╚═══════════════════════════════════════════════════════╝
    `);
  });

  app.on("error", (error: NodeJS.ErrnoException) => {
    if (error.syscall !== "listen") throw error;

    switch (error.code) {
      case "EACCES":
        console.error(`[Error] Port ${port} requires elevated privileges`);
        process.exit(1);
        break;
      case "EADDRINUSE":
        console.error(`[Error] Port ${port} is already in use`);
        process.exit(1);
        break;
      default:
        throw error;
    }
  });
}

if (process.env.NODE_ENV !== "test") {
  initializeApp();
} else {
  isReady = true;
  registerAllTools();
  setupApp(app);
}

export default app;
