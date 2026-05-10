import rateLimit from 'express-rate-limit';

export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: {
      message: 'Too many requests from this IP, please try again later',
      code: 'RATE_LIMIT_EXCEEDED',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const strictRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    error: {
      message: 'Too many requests, please slow down',
      code: 'STRICT_RATE_LIMIT',
    },
  },
});

export const chatRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    error: {
      message: 'Chat rate limit exceeded. Please wait before sending more messages.',
      code: 'CHAT_RATE_LIMIT',
    },
  },
});
