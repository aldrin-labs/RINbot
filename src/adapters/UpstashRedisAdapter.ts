import { StorageAdapter } from "@grammyjs/storage-redis/dist/cjs/deps.node";
import { kv as UpstashVercelRedis } from "@vercel/kv";

// https://gist.github.com/waptik/344b24c5acb5f3b83d723af4921c00a8

/**
 * A storage adapter that uses upstash redis.
 * @template T The type of the data to store.
 *
 * Implementation of StorageAdapter v2 were inspired by @grammyjs/storage-cloudflare
 * @see {@link "https://github.com/grammyjs/storages/blob/main/packages/cloudflare/src/kv.ts"}
 */
export class UpstashRedisAdapter<T> implements StorageAdapter<T> {
  private redis: typeof UpstashVercelRedis;
  private readonly ttl?: number;

  /**
   * @constructor
   * @param {opts} Constructor options
   * @param {opts.ttl} ttl - Session time to life in SECONDS.
   * @param {opts.redis} redis - Instance of upstash redis.
   */
  constructor({ redis, ttl }: { redis?: typeof UpstashVercelRedis; ttl?: number }) {
    if (redis) {
      this.redis = redis;
    } else {
      throw new Error("You should pass an instance of upstash to constructor.");
    }

    this.ttl = ttl;
  }

  async read(key: string) {
    const session = await this.redis.get<T>(key);

    if (session === null || session === undefined) {
      return undefined;
    }
    return session;
  }

  async *readAllKeys(search = "*") {
    const keys = await this.redis.keys(search);
    for (const key of keys) {
      yield key;
    }
  }

  async *readAllValues(search = "*"): AsyncIterable<T> {
    const keys = await this.redis.keys(search);

    for (const key of keys) {
      const value = await this.read(key);
      if (value) {
        yield value;
      }
    } // end for
  }

  async *readAllEntries(search = "*"): AsyncIterable<[key: string, value: T]> {
    const keys = await this.redis.keys(search);

    for (const key of keys) {
      const value = await this.read(key);
      if (value) {
        yield [key, value];
      }
    } // end for
  }

  async has(key: string) {
    const session = await this.redis.exists(key);
    return session > 0;
  }

  async write(key: string, value: T) {
    if (this.ttl) {
      await this.redis.setex(key, this.ttl, value);
    } else {
      await this.redis.set(key, value);
    }
  }

  async delete(key: string) {
    await this.redis.del(key);
  }
}
