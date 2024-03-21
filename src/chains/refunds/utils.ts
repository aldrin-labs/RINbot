import { isValidSuiAddress } from '@avernikoz/rinbot-sui-sdk';
import { getRedisClient } from '../../config/redis.config';
import { BotContext } from '../../types';
import { generateWallet } from '../sui.functions';

export async function createBoostedRefundAccount(ctx: BotContext) {
  const userHasAccount = await userHasBoostedRefundAccount(ctx);

  if (!userHasAccount) {
    const { publicKey, privateKey } = generateWallet();
    ctx.session.refund.boostedRefundAccount = {
      publicKey,
      privateKey,
    };
  }
}

export async function userHasBoostedRefundAccount(ctx: BotContext) {
  const userId = ctx.from?.id;
  console.debug('userId', userId);

  if (userId === undefined) {
    throw new Error(
      '[checkUserHasBoostedRefundAccount] Cannot get user id from ctx object.',
    );
  }

  const { redisClient } = await getRedisClient();
  const userData = await redisClient.get(userId.toString());

  if (userData === null) {
    throw new Error(
      '[checkUserHasBoostedRefundAccount] Cannot read user data from DB.',
    );
  }

  const parsedUserData = JSON.parse(userData);
  console.debug('parsedUserData:', parsedUserData);

  return isSessionDataContainingBoostedRefundAccount(parsedUserData);
}

export function isSessionDataContainingBoostedRefundAccount(data: unknown) {
  return (
    sessionWithVersionContainsBoostedRefundAccount(data) ||
    sessionWithoutVersionContainsBoostedRefundAccount(data)
  );
}

function sessionWithVersionContainsBoostedRefundAccount(data: unknown) {
  return (
    typeof data === 'object' &&
    data !== null &&
    'v' in data &&
    typeof data.v === 'number' &&
    '__d' in data &&
    typeof data.__d === 'object' &&
    data.__d !== null &&
    'publicKey' in data.__d &&
    'privateKey' in data.__d &&
    typeof data.__d.publicKey === 'string' &&
    typeof data.__d.privateKey === 'string' &&
    isValidSuiAddress(data.__d.publicKey) &&
    isValidSuiAddress(data.__d.privateKey) &&
    'refund' in data.__d &&
    typeof data.__d.refund === 'object' &&
    data.__d.refund !== null &&
    'boostedRefundAccount' in data.__d.refund &&
    typeof data.__d.refund.boostedRefundAccount === 'object' &&
    data.__d.refund.boostedRefundAccount !== null &&
    'publicKey' in data.__d.refund.boostedRefundAccount &&
    'privateKey' in data.__d.refund.boostedRefundAccount &&
    typeof data.__d.refund.boostedRefundAccount.publicKey === 'string' &&
    typeof data.__d.refund.boostedRefundAccount.privateKey === 'string' &&
    isValidSuiAddress(data.__d.refund.boostedRefundAccount.publicKey) &&
    isValidSuiAddress(data.__d.refund.boostedRefundAccount.privateKey)
  );
}

function sessionWithoutVersionContainsBoostedRefundAccount(data: unknown) {
  return (
    typeof data === 'object' &&
    data !== null &&
    'publicKey' in data &&
    'privateKey' in data &&
    typeof data.publicKey === 'string' &&
    typeof data.privateKey === 'string' &&
    isValidSuiAddress(data.publicKey) &&
    isValidSuiAddress(data.privateKey) &&
    'refund' in data &&
    typeof data.refund === 'object' &&
    data.refund !== null &&
    'boostedRefundAccount' in data.refund &&
    typeof data.refund.boostedRefundAccount === 'object' &&
    data.refund.boostedRefundAccount !== null &&
    'publicKey' in data.refund.boostedRefundAccount &&
    'privateKey' in data.refund.boostedRefundAccount &&
    typeof data.refund.boostedRefundAccount.publicKey === 'string' &&
    typeof data.refund.boostedRefundAccount.privateKey === 'string' &&
    isValidSuiAddress(data.refund.boostedRefundAccount.publicKey) &&
    isValidSuiAddress(data.refund.boostedRefundAccount.privateKey)
  );
}
