// 应用配置
export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    path: process.env.DB_PATH || './data/tingstudio.db',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'tingstudio_default_secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10),
  },

  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  },

  ai: {
    dashscope: {
      apiKey: process.env.AI_DASHSCOPE_API_KEY || '',
      model: process.env.AI_DASHSCOPE_MODEL || 'qwen-plus',
      baseUrl: process.env.AI_DASHSCOPE_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    },
    zhipu: {
      apiKey: process.env.AI_ZHIPU_API_KEY || '',
      model: process.env.AI_ZHIPU_MODEL || 'glm-4v-flash',
      baseUrl: process.env.AI_ZHIPU_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4',
    },
    deepseek: {
      apiKey: process.env.AI_DEEPSEEK_API_KEY || '',
      model: process.env.AI_DEEPSEEK_MODEL || 'deepseek-chat',
      baseUrl: process.env.AI_DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
    },
    timeout: parseInt(process.env.AI_TIMEOUT || '120000', 10),
  },
} as const
