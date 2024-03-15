import { config } from 'dotenv';
config();

import {
  RedisStorageSingleton,
  StorageProperty,
  getMillisecondsByDcaEveryParams,
  isDCAObjectFieldsArray,
} from '@avernikoz/rinbot-sui-sdk';
import BigNumber from 'bignumber.js';
import { getRedisClient } from '../src/config/redis.config';

export default async function tradeActiveDCAs() {
  const { redisClient } = await getRedisClient();
  const storage = RedisStorageSingleton.getInstance(redisClient);

  // Get DCAs from storage
  const dcasFieldsValue = await storage.getCache({
    property: StorageProperty.DCAs,
  });
  console.debug('[tradeActiveDCAs] dcasFieldsValue:', dcasFieldsValue);

  if (!isDCAObjectFieldsArray(dcasFieldsValue?.value)) {
    throw new Error(
      '[tradeActiveDCAs] Value from storage is not an array of DCAObjectFields.',
    );
  }

  const { value: dcaFields } = dcasFieldsValue;
  const currentTimeInMs = Date.now();

  // Filtering DCAs which must be traded based on their `last_trade_time` & `interval_between_trades`
  const dcasToTrade = dcaFields.filter((dca) => {
    const lastTradeTimeInMs = dca.last_time_ms;
    const intervalBetweenTradesInMs = getMillisecondsByDcaEveryParams(
      dca.every,
      dca.time_scale,
    );

    const mustTrade = new BigNumber(lastTradeTimeInMs)
      .plus(intervalBetweenTradesInMs)
      .isLessThanOrEqualTo(currentTimeInMs);

    return mustTrade;
  });

  await redisClient.disconnect();
  RedisStorageSingleton.removeInstance();
}

tradeActiveDCAs();
