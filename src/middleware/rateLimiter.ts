import { Request, Response, NextFunction } from 'express';
import { RateLimitInfo } from '../types';
import { config } from '../config';

const rateLimitMap = new Map<string, RateLimitInfo>();

function getClientIp(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
    (req.socket.remoteAddress as string) ||
    'unknown'
  );
}

function cleanupRateLimitMap(): void {
  const now = Date.now();
  const keysToDelete: string[] = [];

  for (const [ip, info] of rateLimitMap.entries()) {
    if (
      now - info.windowStart > config.rateLimit.windowMs &&
      now - info.burstStart > config.rateLimit.burstWindowMs
    ) {
      keysToDelete.push(ip);
    }
  }

  keysToDelete.forEach((key) => rateLimitMap.delete(key));
}

setInterval(cleanupRateLimitMap, 60 * 1000);

export function rateLimiter(req: Request, res: Response, next: NextFunction): void {
  const ip = getClientIp(req);
  const now = Date.now();
  let info = rateLimitMap.get(ip);

  if (!info) {
    info = {
      windowStart: now,
      count: 0,
      burstStart: now,
      burstCount: 0,
    };
    rateLimitMap.set(ip, info);
  }

  if (now - info.windowStart > config.rateLimit.windowMs) {
    info.windowStart = now;
    info.count = 0;
  }

  if (now - info.burstStart > config.rateLimit.burstWindowMs) {
    info.burstStart = now;
    info.burstCount = 0;
  }

  if (info.burstCount >= config.rateLimit.burstMaxRequests) {
    const retryAfter = Math.ceil(
      (config.rateLimit.burstWindowMs - (now - info.burstStart)) / 1000
    );
    res.status(429).json({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Burst capacity reached. Please try again later.',
      retryAfter: retryAfter,
    });
    return;
  }

  if (info.count >= config.rateLimit.maxRequests) {
    const retryAfter = Math.ceil(
      (config.rateLimit.windowMs - (now - info.windowStart)) / 1000
    );
    res.status(429).json({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Maximum requests per minute reached. Please try again later.',
      retryAfter: retryAfter,
    });
    return;
  }

  info.count++;
  info.burstCount++;

  next();
}
