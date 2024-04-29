import { RedisStorageClient } from '@avernikoz/rinbot-sui-sdk';
import { getRedisClient } from '../../../config/redis.config';
import { ReferralRedisKeyFirstPart, ReferrerFieldKey } from '../config';

export async function storeReferral({
  referralId,
  publicKey,
}: {
  referralId: string;
  publicKey: string;
}): Promise<void> {
  const { redisClient } = await getRedisClient();

  await storeReferrerField({ redisClient, publicKey, referralId });
}

export async function storeReferrerField({
  referralId,
  publicKey,
  redisClient,
}: {
  referralId: string;
  publicKey: string;
  redisClient: RedisStorageClient;
}) {
  const key = `${ReferralRedisKeyFirstPart.Referrer}:${referralId}`;

  const keyAlreadyExists = !!(await redisClient.exists(key));

  if (keyAlreadyExists) {
    console.error(
      `[storeReferrerField] Cannot store referral with "${referralId}" id and "${publicKey}" public key, ` +
        `because referrer with such a key already exists.`,
    );

    return;
  }

  const fields = {
    [ReferrerFieldKey.PublicKey]: publicKey,
  };
  const fieldsCount = Object.keys(fields).length;

  const countOfCreatedFields = await redisClient.hSet(key, fields);

  if (countOfCreatedFields !== fieldsCount) {
    console.warn(
      `[storeReferrerField] Count of created fields is not equal to ${fieldsCount} while creating referral with ` +
        `"${referralId}" id and "${publicKey}" public key.`,
    );
  }
}

export async function getReferrerPublicKey(referrerId: string): Promise<string | null> {
  const key = `${ReferralRedisKeyFirstPart.Referrer}:${referrerId}`;
  const { redisClient } = await getRedisClient();

  const publicKey = await redisClient.hGet(key, ReferrerFieldKey.PublicKey);

  if (publicKey === undefined) {
    console.warn(`[getReferrerPublicKey] Cannot get public key of referrer with id ${referrerId}`);

    return null;
  }

  return publicKey;
}

export async function addReferralToReferrer({
  referralId,
  referrerId,
}: {
  referralId: string;
  referrerId: string;
}): Promise<void> {
  const { redisClient } = await getRedisClient();

  const key = `${ReferralRedisKeyFirstPart.Referrals}:${referrerId}`;
  const referralJoinedTime = Date.now();

  const fields = {
    [referralId]: referralJoinedTime,
  };
  const fieldsCount = Object.keys(fields).length;

  const countOfCreatedFields = await redisClient.hSet(key, fields);

  if (countOfCreatedFields !== fieldsCount) {
    console.warn(
      `[addReferralToReferrer] Count of created fields is not equal to ${fieldsCount} while adding referral ` +
        `with "${referralId}" id to referrer with "${referrerId}" id`,
    );
  }
}

export async function removeReferralFromReferrer({
  referralId,
  referrerId,
}: {
  referralId: string;
  referrerId: string;
}) {
  const { redisClient } = await getRedisClient();

  const key = `${ReferralRedisKeyFirstPart.Referrals}:${referrerId}`;

  const deletedFieldsCount = await redisClient.hDel(key, referralId);
  const countOfFieldsMustBeDeleted = 1;

  if (deletedFieldsCount !== countOfFieldsMustBeDeleted) {
    console.warn(
      `[removeReferralFromReferrer] Count of deleted fields is not equal to ${countOfFieldsMustBeDeleted} ` +
        `for removing referral with "${referralId}" id for referrer with "${referrerId}" id.`,
    );
  }
}

export async function getReferrerKeys(): Promise<string[]> {
  const { redisClient } = await getRedisClient();
  const referrerKeys = await redisClient.keys(`${ReferralRedisKeyFirstPart.Referrer}:*`);

  return referrerKeys;
}

export async function getExistingReferralIds(): Promise<string[]> {
  const referrerKeys = await getReferrerKeys();

  const firstPartWithColon = `${ReferralRedisKeyFirstPart.Referrer}:`;

  const referralIds = referrerKeys.reduce((ids: string[], referrerKey: string) => {
    const idStartIndex = referrerKey.indexOf(firstPartWithColon) + firstPartWithColon.length;

    if (idStartIndex !== -1 && idStartIndex < referrerKey.length) {
      const id = referrerKey.substring(idStartIndex);
      ids.push(id);
    }

    return ids;
  }, []);

  return referralIds;
}

export async function getUserReferrals(userReferralId: string): Promise<string[]> {
  const key = `${ReferralRedisKeyFirstPart.Referrals}:${userReferralId}`;
  const { redisClient } = await getRedisClient();

  const referralRecords = await redisClient.hGetAll(key);
  const referralIds = Object.keys(referralRecords);

  return referralIds;
}
