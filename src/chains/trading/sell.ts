import {
  CoinAssetData,
  LONG_SUI_COIN_TYPE,
  SHORT_SUI_COIN_TYPE,
  WalletManagerSingleton,
  isValidTokenAddress,
  isValidTokenAmount,
  transactionFromSerializedTransaction,
} from '@avernikoz/rinbot-sui-sdk';
import closeConversation from '../../inline-keyboards/closeConversation';
import { retryAndGoHomeButtonsData } from '../../inline-keyboards/retryConversationButtonsFactory';
import { BotContext, MyConversation } from '../../types';
import { ConversationId } from '../conversations.config';
import { SELL_DELAY_AFTER_BUY_FOR_CLAIMERS_IN_MS } from '../sui.config';
import {
  TransactionResultStatus,
  getCoinManager,
  getRouteManager,
  getWalletManager,
  provider,
  random_uuid,
} from '../sui.functions';
import {
  extractCoinTypeFromLink,
  findCoinInAssets,
  formatMilliseconds,
  getPriceOutputData,
  isCoinAssetData,
  isTransactionSuccessful,
  isValidCoinLink,
  swapTokenTypesAreEqual,
  userMustUseCoinWhitelist,
} from '../utils';

export async function sell(
  conversation: MyConversation,
  ctx: BotContext,
): Promise<void> {
  const availableBalance = await conversation.external(async () => {
    const walletManager = await getWalletManager();
    // TODO: Maybe we should add try/catch here as well
    const balance = await walletManager.getAvailableSuiBalance(
      ctx.session.publicKey,
    );

    return balance;
  });
  const isAmountSuiAmountIsValid = +availableBalance > 0;
  const retryButton = retryAndGoHomeButtonsData[ConversationId.Sell];

  if (!isAmountSuiAmountIsValid) {
    await ctx.reply(
      "You don't have enough SUI for transaction gas. Please, top up your SUI balance to continue.",
      { reply_markup: retryButton },
    );

    return;
  }

  await ctx.reply(
    'Which token do you want to sell? Please send a coin type or a link to suiscan.',
    { reply_markup: closeConversation },
  );

  await ctx.reply(
    'Example of coin type format:\n<code>0xb6baa75577e4bbffba70207651824606e51d38ae23aa94fb9fb700e0ecf50064::kimchi::KIMCHI</code>\n\nExample of suiscan link:\nhttps://suiscan.xyz/mainnet/coin/0xb6baa75577e4bbffba70207651824606e51d38ae23aa94fb9fb700e0ecf50064::kimchi::KIMCHI',
    { parse_mode: 'HTML' },
  );

  const coinManager = await getCoinManager();
  const allCoinsAssets = await conversation.external(async () => {
    const walletManager = await getWalletManager();
    // TODO: Maybe we should add try/catch here as well
    const coinAssets = await walletManager.getAllCoinAssets(
      ctx.session.publicKey,
    );

    return coinAssets;
  });

  let validatedCoin: CoinAssetData | null = null;
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

    let coinType: string;
    if (coinTypeIsValid) {
      coinType = possibleCoin;
    } else {
      const extractedCoin: string | null =
        extractCoinTypeFromLink(possibleCoin);

      // ts check
      if (extractedCoin === null) {
        await ctx.reply(
          'Suiscan link is not valid. Make sure it is correct.\n\nYou can enter a token address or a Suiscan link.',
          { reply_markup: closeConversation },
        );

        return false;
      }

      coinType = extractedCoin;
    }

    const fetchedCoin = await coinManager.getCoinByType2(coinType);

    if (fetchedCoin === null) {
      await ctx.reply(
        `Coin type not found. Make sure type "${coinType}" is correct.\n\nYou can enter a coin type or a Suiscan link.`,
        { reply_markup: closeConversation },
      );

      return false;
    }

    const tokenToSellIsSui: boolean =
      swapTokenTypesAreEqual(fetchedCoin.type, LONG_SUI_COIN_TYPE) ||
      swapTokenTypesAreEqual(fetchedCoin.type, SHORT_SUI_COIN_TYPE);

    if (tokenToSellIsSui) {
      await ctx.reply(
        `You cannot sell SUI for SUI. Please, specify another token to sell.`,
        { reply_markup: closeConversation },
      );

      return false;
    }

    const foundCoin = findCoinInAssets(allCoinsAssets, coinType);

    if (foundCoin === undefined) {
      await ctx.reply(
        'Token is not found in your wallet assets. Please, specify another token to sell.',
        { reply_markup: closeConversation },
      );

      return false;
    }

    if (userMustUseCoinWhitelist(ctx)) {
      const selectedCoinTradesInfo =
        conversation.session.trades[foundCoin.type];

      if (selectedCoinTradesInfo !== undefined) {
        const { lastTradeTimestamp } = selectedCoinTradesInfo;

        const notAllowedToSellCoin =
          lastTradeTimestamp + SELL_DELAY_AFTER_BUY_FOR_CLAIMERS_IN_MS >
          Date.now();

        if (notAllowedToSellCoin) {
          const remainingTimeToAllowSell =
            lastTradeTimestamp +
            SELL_DELAY_AFTER_BUY_FOR_CLAIMERS_IN_MS -
            Date.now();

          const formattedRemainingTime = formatMilliseconds(
            remainingTimeToAllowSell,
          );

          await ctx.reply(
            `You won't be able to sell <b>${foundCoin.symbol || foundCoin.type}</b> you've just ` +
              `purchased for the next <i><b>${formattedRemainingTime}</b></i>. This is a temporary restriction put ` +
              'in place to maintain fairness and prevent any misuse of our boosted refund feature.\n\nYou can try ' +
              "to sell any other coin you'd like.",
            { reply_markup: closeConversation, parse_mode: 'HTML' },
          );

          return false;
        }
      }
    }

    validatedCoin = foundCoin;
    return true;
  });

  // Note: The following check and type assertion exist due to limitations or issues in TypeScript type checking for this specific case.
  // The if statement is not expected to execute, and the type assertion is used to satisfy TypeScript's type system.
  if (!isCoinAssetData(validatedCoin)) {
    await ctx.reply(
      'Token is not found in your wallet assets. Please, specify another token to sell.',
      { reply_markup: retryButton },
    );

    return;
  }

  const validCoinToSell = validatedCoin as CoinAssetData;

  const priceOutput = await conversation.external(() =>
    getPriceOutputData(validCoinToSell),
  );

  await ctx.reply(
    `${priceOutput}Reply with the amount you wish to sell (<code>0</code> - <code>${validCoinToSell.balance}</code> ${validCoinToSell.symbol || validCoinToSell.type}).\n\nExample: <code>0.1</code>`,
    { reply_markup: closeConversation, parse_mode: 'HTML' },
  );

  let validatedInputAmount: string;
  await conversation.waitUntil(async (ctx) => {
    if (ctx.callbackQuery?.data === 'close-conversation') {
      return false;
    }

    const inputAmount = ctx.msg?.text;

    // ts check
    if (inputAmount === undefined) {
      return false;
    }

    const decimals = validCoinToSell.decimals;
    // ts check
    if (decimals === null) {
      await ctx.reply(
        `Token decimals not found for ${validCoinToSell.type}. Please, use another token for sell or contact support.`,
        { reply_markup: closeConversation },
      );

      return false;
    }

    // TODO: Re-check this
    const { isValid: amountIsValid, reason } = isValidTokenAmount({
      amount: inputAmount,
      maxAvailableAmount: validCoinToSell.balance,
      decimals,
    });

    if (!amountIsValid) {
      await ctx.reply(
        `Invalid amount. Reason: ${reason}\n\nPlease, try again.`,
        { reply_markup: closeConversation },
      );

      return false;
    }

    validatedInputAmount = inputAmount;
    return true;
  });

  await ctx.reply('Finding the best route to save your money… ☺️');

  const tx = await conversation.external({
    task: async () => {
      try {
        const routerManager = await getRouteManager();
        const transaction = await routerManager.getBestRouteTransaction({
          tokenFrom: validCoinToSell.type,
          tokenTo: LONG_SUI_COIN_TYPE,
          amount: validatedInputAmount,
          signerAddress: ctx.session.publicKey,
          slippagePercentage: ctx.session.settings.slippagePercentage || 10,
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
    await ctx.reply('Transaction creation failed ❌', {
      reply_markup: retryButton,
    });

    return;
  }

  await ctx.reply(
    'Route for swap found, sending transaction... 🔄' + random_uuid,
  );

  const resultOfSwap: {
    digest?: string;
    result: TransactionResultStatus;
    reason?: string;
  } = await conversation.external(async () => {
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
      `Swap successful ✅\n\nhttps://suiscan.xyz/mainnet/tx/${resultOfSwap.digest}`,
      { reply_markup: retryButton },
    );

    conversation.session.tradesCount = conversation.session.tradesCount + 1;

    return;
  }

  if (resultOfSwap.result === 'failure' && resultOfSwap.digest) {
    await ctx.reply(
      `Swap failed ❌\n\nhttps://suiscan.xyz/mainnet/tx/${resultOfSwap.digest}`,
      { reply_markup: retryButton },
    );

    return;
  }

  await ctx.reply('Transaction sending failed. ❌', {
    reply_markup: retryButton,
  });
}
