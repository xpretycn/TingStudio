import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import { createAppRouter } from "./routes/index.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { logger } from "./utils/logger.js";
import { connectDatabase } from "./config/database.js";

export async function createApp() {
  const app = express();

  // 数据库连接
  await connectDatabase();

  // 全局中间件
  app.use(helmet());
  app.use(
    cors({
      origin: "*",
      credentials: true,
    }),
  );
  app.use(compression());
  app.use(morgan("dev"));
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));

  // 静态文件
  app.use("/uploads", express.static("uploads"));

  // Serverless 环境路径重写（TCB 会去掉 /api 前缀）
  if (process.env.DATA_DIR === "/tmp/data") {
    app.use((req, _res, next) => {
      if (!req.url.startsWith("/api") && req.url !== "/health") {
        req.url = "/api" + req.url;
      }
      next();
    });
  }

  // API 路由
  app.use("/api", createAppRouter());

  // 健康检查
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // 404 处理
  app.use((_req, res) => {
    res.status(404).json({ success: false, message: "接口不存在" });
  });

  // 错误处理
  app.use(errorHandler);

  return app;
}

// 直接运行时启动服务器
async function bootstrap() {
  const app = await createApp();
  const PORT = process.env.PORT || 3000;

  app.listen(PORT, () => {
    logger.info(`TingStudio 后端服务启动成功: http://localhost:${PORT}`);
    logger.info(`环境: ${process.env.NODE_ENV || "development"}`);
  });
}

bootstrap().catch(err => {
  logger.error("服务启动失败:", err);
  process.exit(1);
});
