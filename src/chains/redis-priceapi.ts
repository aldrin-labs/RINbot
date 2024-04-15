import { createClient, RedisClientType } from 'redis';
import { KV_PRICE_API_DB_URL } from '../config/bot.config';

class Redis {
  private static instance: Redis;
  private static client: RedisClientType;

  private constructor() {}

  public static init(): RedisClientType {
    if (!Redis.client) {
      Redis.client = createClient({ url: KV_PRICE_API_DB_URL, socket: { tls: true } });
      Redis.client.connect().catch(console.error);
    }
    return Redis.client;
  }

  public static getInstance(): Redis {
    if (!Redis.instance) Redis.instance = new Redis();
    return Redis.instance;
  }

  public getRedisClient(): RedisClientType {
    if (!Redis.client) {
      throw new Error('Redis client not initialized. Call Redis.init(url) first.');
    }
    return Redis.client;
  }
}

export default Redis;
