import {
  CoinAssetData,
  LONG_SUI_COIN_TYPE,
  SHORT_SUI_COIN_TYPE,
  isValidTokenAddress,
  isValidTokenAmount,
  transactionFromSerializedTransaction,
  WalletManagerSingleton,
  CoinManagerSingleton,
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
import yesOrNo from '../../inline-keyboards/yesOrNo';
import BigNumber from 'bignumber.js';

async function parseCoinTypeResponse(
  ctx: BotContext,
  conversation: MyConversation,
  possibleCoin: string,
  coinManager: CoinManagerSingleton,
  allCoinsAssets: CoinAssetData[],
) {
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
    const extractedCoin: string | null = extractCoinTypeFromLink(possibleCoin);

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
  ctx.session.tradeCoin = {
    coinType: foundCoin.type,
    tradeAmountPercentage: '0',
    useSpecifiedCoin: false,
  };

  if (userMustUseCoinWhitelist(ctx)) {
    const selectedCoinTradesInfo = conversation.session.trades[foundCoin.type];

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

  return true;
}

async function handleInputAmount(
  ctx: BotContext,
  conversation: MyConversation,
  validCoinToSell: CoinAssetData,
  priceOutput: string,
) {
  await ctx.reply(
    `${priceOutput} Reply with the amount you wish to sell (0 - 100 %):`,
    { reply_markup: closeConversation, parse_mode: 'HTML' },
  );
  let result: string = '0';
  await conversation.waitUntil(async (ctx) => {
    if (ctx.callbackQuery?.data === 'close-conversation') {
      return false;
    }

    const inputAmount = ctx.msg?.text;
    if (inputAmount === undefined) {
      return false;
    }

    const decimals = validCoinToSell.decimals;
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
        `Invalid percentage. Reason: ${reason}\n\nPlease, try again.`,
        { reply_markup: closeConversation },
      );

      return false;
    }
    if (parseFloat(inputAmount) < 0 || parseFloat(inputAmount) > 100) {
      await ctx.reply(
        `Invalid percentage. The value should be between 0 and 100\n\nPlease, try again.`,
        { reply_markup: closeConversation },
      );

      return false;
    }
    result = inputAmount;
    return true;
  });
  return result;
}

export async function sell(
  conversation: MyConversation,
  ctx: BotContext,
): Promise<void> {
  const coinManager = await getCoinManager();
  const walletManager = await getWalletManager();
  const availableBalance = await conversation.external(async () => {
    // TODO: Maybe we should add try/catch here as well
    const balance = await walletManager.getAvailableSuiBalance(
      ctx.session.publicKey,
    );

    return balance;
  });
  const allCoinsAssets = await conversation.external(async () => {
    // TODO: Maybe we should add try/catch here as well
    const coinAssets = await walletManager.getAllCoinAssets(
      ctx.session.publicKey,
    );

    return coinAssets;
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
  if (!ctx.session.tradeCoin.coinType) {
    await ctx.reply(
      'Which token do you want to sell? Please send a coin type or a link to suiscan.',
      { reply_markup: closeConversation },
    );

    await ctx.reply(
      'Example of coin type format:\n<code>0xd2c7943bdb372a25c2ac7fa6ab86eb9abeeaa17d8d65e7dcff4c24880eac860b::rincel::RINCEL</code>\n\nExample of suiscan link:\nhttps://suiscan.xyz/mainnet/coin/0xd2c7943bdb372a25c2ac7fa6ab86eb9abeeaa17d8d65e7dcff4c24880eac860b::rincel::RINCEL',
      { parse_mode: 'HTML' },
    );

    await conversation.waitUntil(async (ctx) => {
      if (ctx.callbackQuery?.data === 'close-conversation') {
        return false;
      }
      return parseCoinTypeResponse(
        ctx,
        conversation,
        ctx.msg?.text || '',
        coinManager,
        allCoinsAssets,
      );
    });
  }
  const coinType = ctx.session.tradeCoin.coinType;
  const validatedCoin = await coinManager.getCoinByType2(coinType);
  if (validatedCoin === null) {
    await ctx.reply(
      `Coin type not found. Make sure type "${coinType}" is correct.\n\nYou can enter a coin type or a Suiscan link.`,
      { reply_markup: closeConversation },
    );
  }

  const validCoinToSell = findCoinInAssets(allCoinsAssets, coinType);
  if (!validCoinToSell) {
    await ctx.reply(
      'Token is not found in your wallet assets. Please, specify another token to sell.',
      { reply_markup: closeConversation },
    );
    return;
  }
  const priceOutput = await conversation.external(() =>
    getPriceOutputData(validCoinToSell),
  );
  if (ctx.session.tradeCoin.tradeAmountPercentage === '0') {
    ctx.session.tradeCoin.tradeAmountPercentage = await handleInputAmount(
      ctx,
      conversation,
      validCoinToSell,
      priceOutput,
    );
  }

  if (parseFloat(ctx.session.tradeCoin.tradeAmountPercentage) === 100) {
    const closeButton = closeConversation.inline_keyboard[0];
    const yesOrNoWithCancelReplyMarkup = yesOrNo.clone().add(...closeButton);
    await ctx.reply(
      `You will sell your entire amount of ${ctx.session.tradeCoin.coinType}, confirm?`,
      { reply_markup: yesOrNoWithCancelReplyMarkup },
    );
    const answerMessage = await conversation.waitUntil(async (ctx) => {
      if (ctx.callbackQuery?.data === 'close-conversation') {
        return false;
      }
      if (ctx.callbackQuery?.data === 'yes') {
        await ctx.answerCallbackQuery();
        return true;
      }
      if (ctx.callbackQuery?.data === 'no') {
        await ctx.answerCallbackQuery();
        return true;
      }
      return false;
    });
    const answer = answerMessage.callbackQuery?.data;
    if (answer === 'no') {
      ctx.session.tradeCoin.tradeAmountPercentage = await handleInputAmount(
        ctx,
        conversation,
        validCoinToSell,
        priceOutput,
      );
    }
  }
  const percentage = new BigNumber(
    ctx.session.tradeCoin.tradeAmountPercentage,
  ).dividedBy(100);

  const tradeAmountPercentage = new BigNumber(
    validCoinToSell.balance,
  ).multipliedBy(percentage);

  await instantSell(
    conversation,
    ctx,
    tradeAmountPercentage.toString(),
    validCoinToSell.type,
  );
}

async function instantSell(
  conversation: MyConversation,
  ctx: BotContext,
  tradeAmountPercentage: string,
  resCoinType: string,
): Promise<void> {
  const retryButton = retryAndGoHomeButtonsData[ConversationId.InstantSell];
  await ctx.reply('Finding the best route to save your money… ☺️');

  const tx = await conversation.external({
    task: async () => {
      try {
        const routerManager = await getRouteManager();
        const transaction = await routerManager.getBestRouteTransaction({
          tokenFrom: resCoinType,
          tokenTo: LONG_SUI_COIN_TYPE,
          amount: tradeAmountPercentage,
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
