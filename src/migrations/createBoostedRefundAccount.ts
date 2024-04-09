import { generateWallet } from '../chains/sui.functions';
import { HISTORY_TABLE } from '../config/bot.config';
import { documentClient } from '../services/aws';
import { BotContext, SessionData } from '../types';

export function createBoostedRefundAccount(ctx: BotContext) {
  return (old: SessionData) => {
    const currentBoostedRefundAccount = old.refund.boostedRefundAccount;

    if (currentBoostedRefundAccount === null) {
      // If user doesn't have boosted refund account in session (e.g. in case of old session version),
      // we create & store it to AWS Table and in his session.
      const boostedRefundAccount = generateWallet();

      console.warn(
        `[createBoostedRefundAccount migration] Creating and storing boosted refund account ` +
          `for user ${ctx.from?.id}. ` +
          `His public key: ${old.publicKey}. ` +
          `His new boostedRefundAccount.publicKey: ${boostedRefundAccount.publicKey}`,
      );

      documentClient
        .put({
          TableName: HISTORY_TABLE,
          Item: {
            pk: `${ctx.from?.id}#BOOSTED_ACCOUNT`,
            sk: new Date().getTime(),
            privateKey: boostedRefundAccount.privateKey,
            publicKey: boostedRefundAccount.publicKey,
          },
        })
        .catch((e) => console.error('ERROR storing boosted account', e));

      return { ...old, refund: { ...old.refund, boostedRefundAccount } };
    } else {
      // When user session is newly created, this data is already stored into AWS Table, so it will
      // lead to the duplication of stored boosted refund account.
      // When user session was created before feature with storing data to AWS at session creation,
      // this will lead to storing boosted refund account, which wasn't stored before.
      documentClient
        .put({
          TableName: HISTORY_TABLE,
          Item: {
            pk: `${ctx.from?.id}#BOOSTED_ACCOUNT`,
            sk: new Date().getTime(),
            privateKey: currentBoostedRefundAccount.privateKey,
            publicKey: currentBoostedRefundAccount.publicKey,
          },
        })
        .catch((e) => console.error('ERROR storing boosted account', e));

      return old;
    }
  };
}
