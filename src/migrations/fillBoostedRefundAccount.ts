import { generateWallet } from '../chains/sui.functions';
import { SessionData } from '../types';

export function fillBoostedRefundAccount(old: SessionData) {
  const boostedRefundAccount = generateWallet();

  return {
    ...old,
    refund: { ...old.refund, boostedRefundAccount },
  };
}
