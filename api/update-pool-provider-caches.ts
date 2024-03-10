import {
  AftermathSingleton,
  CetusSingleton,
  FlowxSingleton,
  RedisStorageSingleton,
  TurbosSingleton,
  clmmMainnet,
} from '@avernikoz/rinbot-sui-sdk';
import { getRedisClient } from '../src/config/redis.config';
import { SUI_PROVIDER_URL } from '../src/chains/sui.config';

/**
 * @description Updates the cache of pool providers at regular intervals to minimize the chance of cold starts.
 * If this function completes faster than the time specified in `SUI_LIQUIDITY_PROVIDERS_CACHE_OPTIONS`,
 * we ensure that the client (user) always utilizes an up-to-date cache (e.g., for trading).
 *
 * The primary purpose of this background job is to update more frequently than the time specified in `SUI_LIQUIDITY_PROVIDERS_CACHE_OPTIONS`,
 * preventing clients from having to update the cache on their end when making requests to the Telegram bot.
 *
 * Additionally, this function is necessary to include liquidity pools created by users in a shorter timeframe than specified
 * in `SUI_LIQUIDITY_PROVIDERS_CACHE_OPTIONS` (e.g., instead of 30 minutes, it occurs in 5 minutes).
 *
 * TODO: In case we'd like to protect from abuse usage of that cron-job, we might have an authorization for that endpoint
 */
export default async function updateProviderCaches() {
  console.time('Caches are updated for');

  const { redisClient } = await getRedisClient();
  const redis = RedisStorageSingleton.getInstance(redisClient);

  await TurbosSingleton.getInstance({
    suiProviderUrl: SUI_PROVIDER_URL,
    cacheOptions: {
      storage: redis,
      updateIntervalInMs: 0,
      updateIntervally: false,
    },
    lazyLoading: false,
  });
  await CetusSingleton.getInstance({
    sdkOptions: clmmMainnet,
    cacheOptions: {
      storage: redis,
      updateIntervalInMs: 0,
      updateIntervally: false,
    },
    suiProviderUrl: SUI_PROVIDER_URL,
    lazyLoading: false,
  });
  await AftermathSingleton.getInstance({
    cacheOptions: {
      storage: redis,
      updateIntervalInMs: 0,
      updateIntervally: false,
    },
    lazyLoading: false,
  });
  await FlowxSingleton.getInstance({
    cacheOptions: {
      storage: redis,
      updateIntervalInMs: 0,
      updateIntervally: false,
    },
    lazyLoading: false,
  });

  await redisClient.disconnect();

  console.timeEnd('Caches are updated for');
}