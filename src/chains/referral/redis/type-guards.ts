import { ReferralTradeData } from '../types';

export function isReferralTradeData(data: unknown): data is ReferralTradeData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'feeCoinType' in data &&
    typeof data.feeCoinType === 'string' &&
    'feeAmount' in data &&
    typeof data.feeAmount === 'string'
  );
}
