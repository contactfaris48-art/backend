export const config = {
  cache: {
    ttl: 60 * 1000,
    cleanupInterval: 10 * 1000,
  },
  rateLimit: {
    windowMs: 60 * 1000,
    maxRequests: 10,
    burstWindowMs: 10 * 1000,
    burstMaxRequests: 5,
  },
  queue: {
    concurrency: 3,
    dbDelay: 200,
  },
  server: {
    port: process.env.PORT || 3000,
  },
};
