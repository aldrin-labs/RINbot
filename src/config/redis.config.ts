import { createClient } from "redis";

export const getRedisClient = async () => {
  if (!process.env.KV_URL) {
    throw new Error("Empty REDIS_URL")
  }

  const redisClient = createClient({
    url: process.env.KV_URL,
    socket: { tls: true },
  });

  redisClient.on("error", (error) => {
    console.error("[Redis Client] error event occured:", error);
  });

  await redisClient.connect();

  return { redisClient }
}