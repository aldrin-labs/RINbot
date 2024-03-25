import { isValidSuiAddress } from '@avernikoz/rinbot-sui-sdk';
import { getRedisClient } from '../../config/redis.config';
import { BotContext } from '../../types';
import { generateWallet } from '../sui.functions';
import { documentClient } from '../../services/aws';
import { HISTORY_TABLE } from '../../config/bot.config';

export async function createBoostedRefundAccount(ctx: BotContext) {
  const userHasAccount = await userHasBoostedRefundAccount(ctx);

  if (!userHasAccount) {
    const { publicKey, privateKey } = generateWallet();
    documentClient.put({
      TableName: HISTORY_TABLE,
      Item: {
        pk: `${ctx.from?.id}#BOOSTED_ACCOUNT`,
        sk: `${new Date().getTime()}`,
        privateKey,
        publicKey
      }
    }).catch(e => console.error('ERROR creating boosted account', e));
    ctx.session.refund.boostedRefundAccount = {
      publicKey,
      privateKey,
    };
  }
}

export function backupCurrentAccount(ctx: BotContext) {
  documentClient.put({
    TableName: HISTORY_TABLE,
    Item: {
      pk: `${ctx.from?.id}#BACKUP_WALLET`,
      sk: `${new Date().getTime()}`,
      privateKey: ctx.session.privateKey,
      publicKey: ctx.session.publicKey
    }
  }).catch(e => console.error('ERROR creating backup account in the history', e));
  ctx.session.refund.walletBeforeBoostedRefundClaim = {
    publicKey: ctx.session.publicKey,
    privateKey: ctx.session.privateKey,
  };
}

export async function userHasBoostedRefundAccount(ctx: BotContext) {
  const userId = ctx.from?.id;

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

  return isSessionDataContainingBoostedRefundAccount(parsedUserData);
}

export async function userHasBackupedAccount(ctx: BotContext) {
  const userId = ctx.from?.id;

  if (userId === undefined) {
    throw new Error(
      '[userHasBackupedAccount] Cannot get user id from ctx object.',
    );
  }

  const { redisClient } = await getRedisClient();
  const userData = await redisClient.get(userId.toString());

  if (userData === null) {
    throw new Error('[userHasBackupedAccount] Cannot read user data from DB.');
  }

  const parsedUserData = JSON.parse(userData);

  return isSessionDataContainingBackupedAccount(parsedUserData);
}

export function isSessionDataContainingBoostedRefundAccount(data: unknown) {
  return (
    sessionWithVersionContainsBoostedRefundAccount(data) ||
    sessionWithoutVersionContainsBoostedRefundAccount(data)
  );
}

export function isSessionDataContainingBackupedAccount(data: unknown) {
  return (
    sessionWithVersionContainsBackupedAccount(data) ||
    sessionWithoutVersionContainsBackupedAccount(data)
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

function sessionWithVersionContainsBackupedAccount(data: unknown) {
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
    'walletBeforeBoostedRefundClaim' in data.__d.refund &&
    typeof data.__d.refund.walletBeforeBoostedRefundClaim === 'object' &&
    data.__d.refund.walletBeforeBoostedRefundClaim !== null &&
    'publicKey' in data.__d.refund.walletBeforeBoostedRefundClaim &&
    'privateKey' in data.__d.refund.walletBeforeBoostedRefundClaim &&
    typeof data.__d.refund.walletBeforeBoostedRefundClaim.publicKey ===
      'string' &&
    typeof data.__d.refund.walletBeforeBoostedRefundClaim.privateKey ===
      'string' &&
    isValidSuiAddress(
      data.__d.refund.walletBeforeBoostedRefundClaim.publicKey,
    ) &&
    isValidSuiAddress(data.__d.refund.walletBeforeBoostedRefundClaim.privateKey)
  );
}

function sessionWithoutVersionContainsBackupedAccount(data: unknown) {
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
    'walletBeforeBoostedRefundClaim' in data.refund &&
    typeof data.refund.walletBeforeBoostedRefundClaim === 'object' &&
    data.refund.walletBeforeBoostedRefundClaim !== null &&
    'publicKey' in data.refund.walletBeforeBoostedRefundClaim &&
    'privateKey' in data.refund.walletBeforeBoostedRefundClaim &&
    typeof data.refund.walletBeforeBoostedRefundClaim.publicKey === 'string' &&
    typeof data.refund.walletBeforeBoostedRefundClaim.privateKey === 'string' &&
    isValidSuiAddress(data.refund.walletBeforeBoostedRefundClaim.publicKey) &&
    isValidSuiAddress(data.refund.walletBeforeBoostedRefundClaim.privateKey)
  );
}
