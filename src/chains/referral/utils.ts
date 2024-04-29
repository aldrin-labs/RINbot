import { BotContext, MyConversation } from '../../types';
import { RINBOT_URL } from '../sui.config';
import { PARAMS_SEPARATOR, REF_PARAM_KEY } from './config';
import { getReferrerPublicKey } from './redis/utils';

export function generateReferralId(): string {
  return Date.now().toString();
}

export function getReferralLink(referralId: string): string {
  return `${RINBOT_URL}?start=${REF_PARAM_KEY}=${referralId}`;
}

export function getReferrerIdByParams(params: string) {
  const separatorIndex = params.indexOf(PARAMS_SEPARATOR);

  const keyWithEqualSign = `${REF_PARAM_KEY}=`;
  const refStartIndex = params.indexOf(keyWithEqualSign);
  const referralIdIndex = refStartIndex + keyWithEqualSign.length;

  if (separatorIndex === -1) {
    return params.substring(referralIdIndex);
  } else {
    return params.substring(referralIdIndex, separatorIndex);
  }
}

export async function setReferrerPublicKey({
  ctx,
  conversation,
  referrerId,
}: {
  ctx: BotContext;
  conversation?: MyConversation;
  referrerId: string;
}): Promise<void> {
  const referrerPublicKey = await getReferrerPublicKey(referrerId);
  const session = conversation ? conversation.session : ctx.session;

  session.referral.referrer.publicKey = referrerPublicKey;
}
