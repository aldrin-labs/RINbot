import { generateWallet } from '../chains/sui.functions';
import { HISTORY_TABLE } from '../config/bot.config';
import { documentClient } from '../services/aws';
import { BotContext, SessionData } from '../types';

export function createBoostedRefundAccount(ctx: BotContext) {
  return (old: SessionData) => {
    const currentBoostedRefundAccount = old.refund.boostedRefundAccount;

    if (currentBoostedRefundAccount === null) {
      const boostedRefundAccount = generateWallet();

      documentClient
        .put({
          TableName: HISTORY_TABLE,
          Item: {
            pk: `${ctx.from?.id}#BOOSTED_ACCOUNT`,
            sk: `${new Date().getTime()}`,
            privateKey: boostedRefundAccount.privateKey,
            publicKey: boostedRefundAccount.publicKey,
          },
        })
        .catch((e) => console.error('ERROR storing boosted account', e));

      return { ...old, refund: { ...old.refund, boostedRefundAccount } };
    } else {
      return old;
    }
  };
}
