import { RedisStorageClient } from "@avernikoz/rinbot-sui-sdk";
import { createClient } from "redis";


let redisClient: RedisStorageClient | undefined = undefined

export const getRedisClient = async (): Promise<{redisClient: RedisStorageClient}> => {
  if (!process.env.KV_URL) {
    throw new Error("Empty REDIS_URL")
  }

  if (redisClient) {
    return { redisClient }
  }

  console.time("[getRedisClient] init")
  redisClient = createClient({
    url: process.env.KV_URL,
    socket: { tls: true },
  });

  redisClient.on("error", (error) => {
    console.error("[Redis Client] error event occured:", error);
  });

  await redisClient.connect();
  console.timeEnd("[getRedisClient] init")

  return { redisClient }
}