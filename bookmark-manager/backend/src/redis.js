import { createClient } from 'redis';

export const redis = createClient({ url: process.env.REDIS_URL || 'redis://redis:6379' });
redis.on('error', (err) => console.error('[redis] error', err));

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
