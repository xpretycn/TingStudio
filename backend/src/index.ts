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

import { connectDatabase } from "./config/database-adapter.js";
import { AIService } from "./services/ai/AIService.js";
import { initializeLLMAgentService } from "./services/ai/agent/index.js";
import { registerAllTools } from "./services/ai/agent/toolRegistration.js";
import { parseResultCleanupService } from "./services/parseResultCleanupService.js";

const app = express();
const PORT = process.env.PORT || 3000;

function setupApp(app: express.Application): void {
  configureMiddleware(app);
  configureRoutes(app);
  configureErrorHandling(app);
}

function initializeApp(): void {
  console.log("[Startup] Initializing TingStudio AI Agent Backend...");

  connectDatabase()
    .then(() => {
      const aiService = new AIService();
      initializeLLMAgentService(aiService);

      registerAllTools();

      parseResultCleanupService.startScheduledCleanup();

      setupApp(app);

      startServer(app, PORT);

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
  registerAllTools();
  setupApp(app);
}

export default app;
