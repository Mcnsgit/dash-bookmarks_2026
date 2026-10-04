import { createClient } from 'redis';

export const redis = createClient({
  url: process.env.REDIS_URL || 'redis://redis:6379',
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 3) {
        return new Error('Redis connection retry limit reached');
      }
      return Math.min(retries * 100, 1000);
    },
  },
});
redis.on('error', (err) => {
  if (process.env.DEBUG || !err.message?.includes('ECONNREFUSED')) {
    console.error('[redis] error', err.message || err);
  }
});

export async function redisInit() {
  if (!redis.isOpen) {
    try {
      await redis.connect();
      console.log('[redis] connected');
    } catch (e) {
      console.warn('[redis] not connected:', e.message);
    }
  }
}
