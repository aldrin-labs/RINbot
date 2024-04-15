import {
  GetTransactionType,
  TransactionBlock,
  WalletManagerSingleton,
  isTransactionBlock,
  transactionFromSerializedTransaction,
} from '@avernikoz/rinbot-sui-sdk';
import { BotContext, MyConversation } from '../types';
import { TransactionResultStatus, provider, randomUuid } from './sui.functions';
import { SuiTransactionBlockResponse } from './types';
import { isTransactionSuccessful } from './utils';

/**
 * Wraps `getTransactionFromMethodWithoutConversation` method result in `conversation.external`, so grammY will cache
 * the result.
 *
 * @returns `getTransactionFromMethodWithoutConversation` result.
 */
export async function getTransactionFromMethod<
  T extends (
    params: Parameters<T>[0],
  ) => Promise<TransactionBlock> | TransactionBlock | GetTransactionType | Awaited<GetTransactionType>,
>({
  conversation,
  ctx,
  method,
  params,
}: {
  conversation: MyConversation;
  ctx: BotContext;
  method: T;
  params: Parameters<T>[0];
}) {
  const transaction = await conversation.external({
    task: () => getTransactionFromMethodWithoutConversation({ method, params }),
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
        `[getTransactionFromMethod]: Error in afterLoadError for ${ctx.from?.username} and instance ${randomUuid}`,
      );
      console.error(error);
    },
    beforeStoreError: async (error) => {
      console.debug(
        `[getTransactionFromMethod] Error in beforeStoreError for ${ctx.from?.username} and instance ${randomUuid}`,
      );
      console.error(error);
    },
  });

  return transaction;
}

/**
 * Gets transaction block from `method` with given `params`.
 * Doesn't use `conversation.external`, so can be used outside of a conversation. If you use it inside the
 * conversation, be aware that the result won't be cached by grammY.
 *
 * @returns Transaction block returned from `method`. `undefined` in error case.
 */
export async function getTransactionFromMethodWithoutConversation<
  T extends (
    params: Parameters<T>[0],
  ) => Promise<TransactionBlock> | TransactionBlock | GetTransactionType | Awaited<GetTransactionType>,
>({ method, params }: { method: T; params: Parameters<T>[0] }): Promise<TransactionBlock | undefined> {
  try {
    const tx = await method(params);

    if (isTransactionBlock(tx)) {
      return tx;
    } else if (isTransactionBlock(tx.tx)) {
      return tx.tx;
    } else {
      console.warn('[getTransactionFromMethodWithoutConversation] Transaction is not found in method result.');
      return;
    }
  } catch (error) {
    console.error(error);

    if (error instanceof Error) {
      console.error(
        `[getTransactionFromMethodWithoutConversation(${method.name})] failed to create transaction: ${error.message}`,
      );
    } else {
      console.error(
        `[getTransactionFromMethodWithoutConversation(${method.name})] failed to create transaction: ${error}`,
      );
    }

    return;
  }
}

// TODO: Remove this method after replacing and testing with `getTransactionFromMethod`
export async function getTransactionForStructuredResult<T extends (params: Parameters<T>[0]) => GetTransactionType>({
  conversation,
  ctx,
  method,
  params,
}: {
  conversation: MyConversation;
  ctx: BotContext;
  method: T;
  params: Parameters<T>[0];
}) {
  const transaction = await conversation.external({
    task: async () => {
      try {
        const { tx } = await method(params);

        return tx;
      } catch (error) {
        console.error(error);

        if (error instanceof Error) {
          console.error(
            `[getTransactionForStructuredResult(${method.name})] failed to create transaction: ${error.message}`,
          );
        } else {
          console.error(`[getTransactionForStructuredResult(${method.name})] failed to create transaction: ${error}`);
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
      console.debug(`Error in afterLoadError for ${ctx.from?.username} and instance ${randomUuid}`);
      console.error(error);
    },
    beforeStoreError: async (error) => {
      console.debug(`Error in beforeStoreError for ${ctx.from?.username} and instance ${randomUuid}`);
      console.error(error);
    },
  });

  return transaction;
}

/**
 * Wraps `signAndExecuteTransactionWithoutConversation` method result in `conversation.external`, so grammY will cache
 * the result.
 *
 * @returns `signAndExecuteTransactionWithoutConversation` result.
 */
export async function signAndExecuteTransaction({
  conversation,
  ctx,
  transaction,
  signerPrivateKey = ctx.session.privateKey,
}: {
  conversation: MyConversation;
  ctx: BotContext;
  transaction: TransactionBlock;
  signerPrivateKey?: string;
}): Promise<{
  digest?: string;
  result: TransactionResultStatus;
  reason?: string;
}> {
  const resultOfExecution: {
    digest?: string;
    result: TransactionResultStatus;
    reason?: string;
  } = await conversation.external(() =>
    signAndExecuteTransactionWithoutConversation({ ctx, transaction, signerPrivateKey }),
  );

  return resultOfExecution;
}

/**
 * Signs and executes transaction block with given `signerPrivateKey` (`ctx.session.privateKey` by default).
 * Doesn't use `conversation.external`, so can be used outside of a conversation. If you use it inside the
 * conversation, be aware that the result won't be cached by grammY.
 *
 * @returns Transaction digest and result status. In case of error returns failed status and failure reason.
 */
export async function signAndExecuteTransactionWithoutConversation({
  ctx,
  transaction,
  signerPrivateKey = ctx.session.privateKey,
}: {
  ctx: BotContext;
  transaction: TransactionBlock;
  signerPrivateKey?: string;
}): Promise<{
  digest?: string;
  result: TransactionResultStatus;
  reason?: string;
}> {
  try {
    const res = await provider.signAndExecuteTransactionBlock({
      transactionBlock: transaction,
      signer: WalletManagerSingleton.getKeyPairFromPrivateKey(signerPrivateKey),
      options: {
        showEffects: true,
      },
    });

    const isTransactionResultSuccessful = isTransactionSuccessful(res);
    const result = isTransactionResultSuccessful ? TransactionResultStatus.Success : TransactionResultStatus.Failure;

    return { digest: res.digest, result };
  } catch (error) {
    if (error instanceof Error) {
      console.error(`[provider.signAndExecuteTransactionBlock] failed to send transaction: ${error.message}`);
    } else {
      console.error(`[provider.signAndExecuteTransactionBlock] failed to send transaction: ${error}`);
    }

    const result = TransactionResultStatus.Failure;
    return { result: result, reason: 'failed_to_send_transaction' };
  }
}

export async function signAndExecuteTransactionAndReturnResult({
  conversation,
  ctx,
  transaction,
}: {
  conversation: MyConversation;
  ctx: BotContext;
  transaction: TransactionBlock;
}) {
  const resultOfExecution: {
    transactionResult?: SuiTransactionBlockResponse;
    digest?: string;
    resultStatus: TransactionResultStatus;
    reason?: string;
  } = await conversation.external(async () => {
    try {
      const transactionResult = await provider.signAndExecuteTransactionBlock({
        transactionBlock: transaction,
        signer: WalletManagerSingleton.getKeyPairFromPrivateKey(ctx.session.privateKey),
        options: {
          showEvents: true,
          showBalanceChanges: true,
          showEffects: true,
          showObjectChanges: true,
        },
        requestType: 'WaitForLocalExecution',
      });

      const isTransactionResultSuccessful = isTransactionSuccessful(transactionResult);

      const resultStatus = isTransactionResultSuccessful
        ? TransactionResultStatus.Success
        : TransactionResultStatus.Failure;

      return {
        transactionResult,
        resultStatus,
        digest: transactionResult.digest,
      };
    } catch (error) {
      if (error instanceof Error) {
        console.error(`[provider.signAndExecuteTransactionBlock] failed to send transaction: ${error.message}`);
      } else {
        console.error(`[provider.signAndExecuteTransactionBlock] failed to send transaction: ${error}`);
      }

      const resultStatus = TransactionResultStatus.Failure;
      return { resultStatus, reason: 'failed_to_send_transaction' };
    }
  });

  return resultOfExecution;
}
