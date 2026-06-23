import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const requestCounts = new Map<string, RateLimitRecord>();

/**
 * Dependency-free memory rate limiter middleware
 * @param limit Max number of requests allowed in the window
 * @param windowMs Window size in milliseconds
 */
export function rateLimiter(limit: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = (req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').toString();
    const now = Date.now();
    const record = requestCounts.get(ip);

    if (!record) {
      requestCounts.set(ip, { count: 1, resetTime: now + windowMs });
      next();
      return;
    }

    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + windowMs;
      next();
      return;
    }

    record.count++;
    if (record.count > limit) {
      console.warn(`⚠️ [RATE LIMIT] IP ${ip} exceeded limit of ${limit} requests. Blocked.`);
      res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
        retryAfterSeconds: Math.ceil((record.resetTime - now) / 1000)
      });
      return;
    }

    next();
  };
}
