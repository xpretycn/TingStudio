const serverless = require("serverless-http");
const fs = require("fs");
const path = require("path");

const TMP_DIRS = ["/tmp/uploads", "/tmp/exports", "/tmp/data"];

function ensureTmpDirs() {
  TMP_DIRS.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

function loadEnvConfig() {
  const envPath = path.join(__dirname, '.env.production');

  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');

    lines.forEach(line => {
      line = line.trim();
      if (!line || line.startsWith('#')) return;

      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        process.env[key.trim()] = value.replace(/^["']|["']$/g, '');
      }
    });

    console.log('✅ 已加载 .env.production 配置');
  } else {
    console.warn('⚠️  未找到 .env.production 文件');
  }
}

async function bootstrap() {
  ensureTmpDirs();

  loadEnvConfig();

  process.env.UPLOAD_DIR = "/tmp/uploads";
  process.env.EXPORT_DIR = "/tmp/exports";
  process.env.DATA_DIR = "/tmp/data";

  const { createApp } = require("./dist/index.js.js");
  const app = await createApp();

  app.use((req, _res, next) => {
    if (!req.url.startsWith("/api")) {
      req.url = "/api" + req.url;
    }
    next();
  });

  return app;
}

let cachedServer = null;

exports.main_handler = async (event, context) => {
  if (!cachedServer) {
    const expressApp = await bootstrap();
    cachedServer = serverless(expressApp, {
      binaryMimeTypes: ["application/octet-stream"],
    });
  }
  return cachedServer(event, context);
};
