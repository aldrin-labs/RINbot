import { RefundManagerSingleton } from '@avernikoz/rinbot-sui-sdk';
import { SUI_PROVIDER_URL } from '../sui.config';

export function getRefundManager() {
  return RefundManagerSingleton.getInstance(SUI_PROVIDER_URL);
}
