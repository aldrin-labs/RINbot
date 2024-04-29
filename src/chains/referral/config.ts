import { Options } from '@loskir/styled-qr-code-node';

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

export const REFERRAL_QR_CODE_CONFIG: Options = {
  width: 1000,
  height: 1000,
  margin: 60,
  qrOptions: { typeNumber: 0, mode: 'Byte', errorCorrectionLevel: 'Q' },
  imageOptions: { hideBackgroundDots: true, imageSize: 0.3, margin: 8 },
  dotsOptions: {
    type: 'rounded',
    color: '#6a1a4c',
    gradient: {
      type: 'linear',
      rotation: 0.7853981633974483,
      colorStops: [
        { offset: 0, color: '#e9755d' },
        { offset: 1, color: '#5f54ff' },
      ],
    },
  },
  backgroundOptions: { color: '#ffffff' },
  cornersSquareOptions: {
    type: 'extra-rounded',
    color: '#f3c0f1',
    gradient: {
      type: 'linear',
      rotation: 3.141592653589793,
      colorStops: [
        { offset: 0, color: '#eb755d' },
        { offset: 1, color: '#5d53f6' },
      ],
    },
  },
  cornersDotOptions: {
    color: '#f3c0f1',
    gradient: {
      type: 'linear',
      rotation: 3.141592653589793,
      colorStops: [
        { offset: 0, color: '#eb755d' },
        { offset: 1, color: '#5f53f5' },
      ],
    },
  },
};
