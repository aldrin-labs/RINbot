/**
 * This is a timestamp in ms length.
 */
export const REFERRAL_ID_LENGTH = 13;

export const PARAMS_SEPARATOR = '_';
export const REF_PARAM_KEY = 'ref';

export enum ReferralRedisKeyFirstPart {
  Referrer = 'referrer',
  Referrals = 'referrals',
}

export enum ReferrerFieldKey {
  PublicKey = 'publicKey',
}
