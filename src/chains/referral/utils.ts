import { QRCodeCanvas } from '@loskir/styled-qr-code-node';
import { InputFile } from 'grammy';
import { BotContext, MyConversation } from '../../types';
import { RINBOT_LOGO_URL, RINBOT_URL } from '../sui.config';
import { imageUrlToBase64 } from '../utils';
import { PARAMS_SEPARATOR, REFERRAL_QR_CODE_CONFIG, REF_PARAM_KEY } from './config';
import { getReferrerPublicKey } from './redis/utils';

export function generateReferralId(): string {
  return Date.now().toString();
}

export function getReferralLink(referralId: string): string {
  return `${RINBOT_URL}?start=${REF_PARAM_KEY}=${referralId}`;
}

export async function getReferralQrCode(referralLink: string): Promise<InputFile> {
  const rinbotLogoBase64 = await imageUrlToBase64(RINBOT_LOGO_URL);
  const qrCode = new QRCodeCanvas({ ...REFERRAL_QR_CODE_CONFIG, data: referralLink, image: rinbotLogoBase64 });

  const buffer = await qrCode.toBuffer();
  const file = new InputFile(buffer);

  return file;
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
