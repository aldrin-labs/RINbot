import {
  DCAManagerSingleton,
  transactionFromSerializedTransaction,
} from '@avernikoz/rinbot-sui-sdk';
import { BotContext, MyConversation } from '../../types';
import { random_uuid } from '../sui.functions';

// TODO: Use `getTransactionFromMethod` and remove this method
export async function getCreateDCATransaction({
  conversation,
  ctx,
  params,
}: {
  conversation: MyConversation;
  ctx: BotContext;
  params: Parameters<typeof DCAManagerSingleton.createDCAInitTransaction>[0];
}) {
  const transaction = await conversation.external({
    task: async () => {
      try {
        const { tx } =
          await DCAManagerSingleton.createDCAInitTransaction(params);

        return tx;
      } catch (error) {
        console.error(error);

        if (error instanceof Error) {
          console.error(
            `[CoinManagerSingleton.getCreateCoinTransaction] failed to create pool creation transaction: ${error.message}`,
          );
        } else {
          console.error(
            `[CoinManagerSingleton.getCreateCoinTransaction] failed to create pool creation transaction: ${error}`,
          );
        }

        return;
      }
    },
    beforeStore: (value) => {
      if (value) {
        return value.serialize();
      }
    },
    afterLoad: async (value) => {
      if (value) {
        return transactionFromSerializedTransaction(value);
      }
    },
    afterLoadError: async (error) => {
      console.debug(
        `Error in afterLoadError for ${ctx.from?.username} and instance ${random_uuid}`,
      );
      console.error(error);
    },
    beforeStoreError: async (error) => {
      console.debug(
        `Error in beforeStoreError for ${ctx.from?.username} and instance ${random_uuid}`,
      );
      console.error(error);
    },
  });

  return transaction;
}
