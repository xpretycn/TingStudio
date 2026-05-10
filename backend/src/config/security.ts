export const securityConfig = {
  helmet: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://api.*"],
        fontSrc: ["'self'", "https:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    originAgentCluster: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    strictTransportSecurity: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    xContentTypeOptions: "nosniff",
    xFrameOptions: "DENY",
    xXssProtection: "1; mode=block",
  },

  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
    ],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
    maxAge: 86400,
  },

  bodySizeLimits: {
    json: '10mb',
    urlencoded: '10mb',
    text: '10mb',
  },

  trustedProxies: process.env.TRUSTED_PROXIES?.split(',') || [],
};

export const apiConfig = {
  version: '2.0.0',
  name: 'TingStudio AI Agent API',
  description: 'AI Agent intelligent interaction system for formula management',

  endpoints: {
    health: '/health',
    status: '/api/status',
    agent: '/api/agent',
    salespersons: '/api/salespersons',
    sales: '/api/sales',
  },

  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
  },

  timeout: {
    request: 30000,
    response: 60000,
  },
};
