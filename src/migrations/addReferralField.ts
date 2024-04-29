import { storeReferral } from '../chains/referral/redis/utils';
import { generateReferralId } from '../chains/referral/utils';
import { SessionData } from '../types';

export function addReferralField(old: SessionData) {
  const referralId = generateReferralId();

  storeReferral({ publicKey: old.publicKey, referralId });

  return {
    ...old,
    referral: { referralId, referrer: { id: null, publicKey: null, newId: null } },
  };
}
