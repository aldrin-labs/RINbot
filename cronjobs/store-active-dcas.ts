import {
  DCAManagerSingleton,
  DCAObjectFields,
  RedisStorageSingleton,
  StorageProperty,
} from '@avernikoz/rinbot-sui-sdk';
import { SUI_PROVIDER_URL } from '../src/chains/sui.config';
import { getRedisClient } from '../src/config/redis.config';

export default async function storeActiveDCAs() {
  console.time('DCAs are stored for');

  const { redisClient } = await getRedisClient();
  const storage = RedisStorageSingleton.getInstance(redisClient);

  const DCAInstance = DCAManagerSingleton.getInstance(SUI_PROVIDER_URL);
  const activeDCAsFields: DCAObjectFields[] =
    await DCAInstance.getActiveDCAsFieldsByPackage();
  const timestamp = Date.now().toString();

  await storage.setCache({
    property: StorageProperty.DCAs,
    value: { value: activeDCAsFields, timestamp },
  });

  await redisClient.disconnect();
  RedisStorageSingleton.removeInstance();

  console.timeEnd('DCAs are stored for');
}
