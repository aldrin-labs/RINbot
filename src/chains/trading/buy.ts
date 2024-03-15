import {
  isValidTokenAddress,
  LONG_SUI_COIN_TYPE,
  SHORT_SUI_COIN_TYPE,
  isValidTokenAmount,
  SUI_DECIMALS,
  transactionFromSerializedTransaction,
  WalletManagerSingleton,
  RouteManager,
} from '@avernikoz/rinbot-sui-sdk';
import closeConversation from '../../inline-keyboards/closeConversation';
import { retryAndGoHomeButtonsData } from '../../inline-keyboards/retryConversationButtonsFactory';
import { MyConversation, BotContext } from '../../types';
import { ConversationId } from '../conversations.config';
import {
  getCoinManager,
  getWalletManager,
  random_uuid,
  getRouteManager,
  provider,
  TransactionResultStatus,
} from '../sui.functions';
import {
  isValidCoinLink,
  extractCoinTypeFromLink,
  swapTokenTypesAreEqual,
  isTransactionSuccessful,
  getPriceOutputData,
} from '../utils';
import { EXTERNAL_WALLET_ADDRESS_TO_STORE_FEES } from '../../config/bot.config';
import { getUserFeePercentage } from '../fees/utils';

export async function buy(conversation: MyConversation, ctx: BotContext) {
  const retryButton = retryAndGoHomeButtonsData[ConversationId.Buy];
  const useSpecifiedCoin = await conversation.external(
    () => ctx.session.tradeCoin.useSpecifiedCoin,
  );
  const coinType = ctx.session.tradeCoin.coinType;

  let validatedCoinType: string | undefined;
  let coinDecimals: number | undefined;

  if (useSpecifiedCoin) {
    const fetchedCoin = await conversation.external(async () => {
      const coinManager = await getCoinManager();
      const coinData = await coinManager.getCoinByType2(coinType);

      return coinData;
    });

    if (fetchedCoin === null) {
      await ctx.reply(
        `Specified coin is not found. Please, try again later or contact support.`,
        { reply_markup: retryButton },
      );

      return;
    }

    validatedCoinType = coinType;
    coinDecimals = fetchedCoin.decimals;

    ctx.session.tradeCoin.useSpecifiedCoin = false;
  } else {
    await ctx.reply(
      'Which token do you want to buy? Please send a coin type or a link to suiscan.',
      { reply_markup: closeConversation },
    );

    await ctx.reply(
      'Example of coin type format:\n<code>0xb6baa75577e4bbffba70207651824606e51d38ae23aa94fb9fb700e0ecf50064::kimchi::KIMCHI</code>\n\nExample of suiscan link:\nhttps://suiscan.xyz/mainnet/coin/0xb6baa75577e4bbffba70207651824606e51d38ae23aa94fb9fb700e0ecf50064::kimchi::KIMCHI',
      { parse_mode: 'HTML' },
    );

    const coinManager = await getCoinManager();

    await conversation.waitUntil(async (ctx) => {
      if (ctx.callbackQuery?.data === 'close-conversation') {
        return false;
      }

      const possibleCoin = (ctx.msg?.text || '').trim();
      const coinTypeIsValid = isValidTokenAddress(possibleCoin);
      const suiScanLinkIsValid = isValidCoinLink(possibleCoin);

      if (!coinTypeIsValid && !suiScanLinkIsValid) {
        const replyText =
          'Token address or suiscan link is not correct. Make sure inputed data is correct.\n\nYou can enter a token address or a Suiscan link.';

        await ctx.reply(replyText, { reply_markup: closeConversation });

        return false;
      }

      const coinType: string | null = coinTypeIsValid
        ? possibleCoin
        : extractCoinTypeFromLink(possibleCoin);

      // ts check
      if (coinType === null) {
        await ctx.reply(
          'Suiscan link is not valid. Make sure it is correct.\n\nYou can enter a token address or a Suiscan link.',
          { reply_markup: closeConversation },
        );
        return false;
      }

      const fetchedCoin = await coinManager.getCoinByType2(coinType);

      if (fetchedCoin === null) {
        await ctx.reply(
          `Coin type not found. Make sure type "${coinType}" is correct.\n\nYou can enter a coin type or a Suiscan link.`,
          { reply_markup: closeConversation },
        );

        return false;
      }

      const tokenToBuyIsSui: boolean =
        swapTokenTypesAreEqual(fetchedCoin.type, LONG_SUI_COIN_TYPE) ||
        swapTokenTypesAreEqual(fetchedCoin.type, SHORT_SUI_COIN_TYPE);

      if (tokenToBuyIsSui) {
        await ctx.reply(
          `You cannot buy SUI for SUI. Please, specify another token to buy.`,
          { reply_markup: closeConversation },
        );

        return false;
      }

      validatedCoinType = fetchedCoin.type;
      coinDecimals = fetchedCoin.decimals;

      return true;
    });
  }

  const availableBalance = await conversation.external(async () => {
    const walletManager = await getWalletManager();
    // TODO: Maybe we should add try/catch here as well
    const balance = await walletManager.getAvailableSuiBalance(
      ctx.session.publicKey,
    );
    return balance;
  });
  let priceOutput = '';
  if (validatedCoinType !== undefined) 
    priceOutput = await getPriceOutputData(validatedCoinType)

  await ctx.reply(
    `${priceOutput}Reply with the amount you wish to spend (<code>0</code> - <code>${availableBalance}</code> SUI).\n\nExample: <code>0.1</code>`,
    { reply_markup: closeConversation, parse_mode: 'HTML' },
  );

  let validatedInputAmount: string | undefined;
  await conversation.waitUntil(async (ctx) => {
    if (ctx.callbackQuery?.data === 'close-conversation') {
      return false;
    }

    const inputAmount = ctx.msg?.text;

    // ts check
    if (inputAmount === undefined) {
      return false;
    }

    // TODO: TEST
    const { isValid: amountIsValid, reason } = isValidTokenAmount({
      amount: inputAmount,
      maxAvailableAmount: availableBalance,
      decimals: SUI_DECIMALS,
    });

    if (!amountIsValid) {
      await ctx.reply(
        `Invalid amount. Reason: ${reason}\n\nPlease, try again.`,
        { reply_markup: closeConversation },
      );

      return false;
    }

    await ctx.reply('Initiating swap...' + random_uuid);

    validatedInputAmount = inputAmount;
    return true;
  });

  // ts check
  if (!validatedCoinType || !validatedInputAmount) {
    await ctx.reply(
      `Invalid coinType or inputAmount. Please try again or contact support.`,
      { reply_markup: retryButton },
    );

    return;
  }

  // ts check
  if (coinDecimals === undefined) {
    await ctx.reply(
      'Cannot process coin decimals. Please, try again or contact support.',
      { reply_markup: retryButton },
    );

    return;
  }

  const feePercentage = (
    await conversation.external(() => getUserFeePercentage(ctx))
  ).toString();

  const feeAmount = RouteManager.calculateFeeAmountIn({
    feePercentage,
    amount: validatedInputAmount,
    tokenDecimals: coinDecimals,
  });

  // TODO: Re-check args here
  const tx = await conversation.external({
    args: [validatedCoinType, validatedInputAmount],
    task: async (validatedCoinType: string, validatedInputAmount: string) => {
      try {
        const routerManager = await getRouteManager();
        const transaction = await routerManager.getBestRouteTransaction({
          tokenFrom: LONG_SUI_COIN_TYPE,
          tokenTo: validatedCoinType,
          amount: validatedInputAmount,
          signerAddress: ctx.session.publicKey,
          slippagePercentage: ctx.session.settings.slippagePercentage,
          fee: {
            feeAmount,
            feeCollectorAddress: EXTERNAL_WALLET_ADDRESS_TO_STORE_FEES,
          },
        });

        return transaction;
      } catch (error) {
        console.error(error);

        if (error instanceof Error) {
          console.error(
            `[routerManager.getBestRouteTransaction] failed to create transaction: ${error.message}`,
          );
        } else {
          console.error(
            `[routerManager.getBestRouteTransaction] failed to create transaction: ${error}`,
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

  if (!tx) {
    await ctx.reply('Transaction creation failed.', {
      reply_markup: retryButton,
    });

    return;
  }

  await ctx.reply('Route for swap found, sending transaction...' + random_uuid);

  const resultOfSwap = await conversation.external(async () => {
    try {
      const res = await provider.signAndExecuteTransactionBlock({
        transactionBlock: tx,
        signer: WalletManagerSingleton.getKeyPairFromPrivateKey(
          ctx.session.privateKey,
        ),
        options: {
          showEffects: true,
        },
      });

      const isTransactionResultSuccessful = isTransactionSuccessful(res);
      const result = isTransactionResultSuccessful
        ? TransactionResultStatus.Success
        : TransactionResultStatus.Failure;

      return { digest: res.digest, result };
    } catch (error) {
      if (error instanceof Error) {
        console.error(
          `[provider.signAndExecuteTransactionBlock] failed to send transaction: ${error.message}`,
        );
      } else {
        console.error(
          `[provider.signAndExecuteTransactionBlock] failed to send transaction: ${error}`,
        );
      }

      const result = TransactionResultStatus.Failure;
      return { result: result, reason: 'failed_to_send_transaction' };
    }
  });

  if (resultOfSwap.result === 'success' && resultOfSwap.digest) {
    await ctx.reply(
      `Swap successful!\n\nhttps://suiscan.xyz/mainnet/tx/${resultOfSwap.digest}`,
      { reply_markup: retryButton },
    );

    conversation.session.tradesCount = conversation.session.tradesCount + 1;

    return;
  }

  if (resultOfSwap.result === 'failure' && resultOfSwap.digest) {
    await ctx.reply(
      `Swap failed.\n\nhttps://suiscan.xyz/mainnet/tx/${resultOfSwap.digest}`,
      { reply_markup: retryButton },
    );

    return;
  }

  await ctx.reply('Transaction sending failed.', { reply_markup: retryButton });
}
