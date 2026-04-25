import rateLimit from 'express-rate-limit';

/** Rate limiter for auth endpoints: 10 requests per 15 minutes per IP. */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests', retryAfter: 900 },
});
