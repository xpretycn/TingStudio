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

async function bootstrap() {
  ensureTmpDirs();

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
