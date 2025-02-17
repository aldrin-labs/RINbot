import {
  CoinAssetData,
  CoinManagerSingleton,
  LONG_SUI_COIN_TYPE,
  isSuiCoinType,
  isValidTokenAddress,
} from '@avernikoz/rinbot-sui-sdk';
import BigNumber from 'bignumber.js';
import closeConversation from '../../inline-keyboards/closeConversation';
import confirmWithCloseKeyboard from '../../inline-keyboards/mixed/confirm-with-close';
import { retryAndGoHomeButtonsData } from '../../inline-keyboards/retryConversationButtonsFactory';
import whitelistCoinsKeyboard, { coinCallbackQueriesData } from '../../inline-keyboards/trading/whitelist-coin-buttons';
import { getTwoButtonsInColumn } from '../../inline-keyboards/utils';
import coinWhitelist from '../../storage/coin-whitelist';
import { BotContext, MyConversation } from '../../types';
import { CallbackQueryData } from '../../types/callback-queries-data';
import { getWhitelistCoinIndexFromCallbackQueryData } from '../coin-whitelist/utils';
import { CommonConversationId } from '../conversations.config';
import { signAndExecuteTransaction } from '../conversations.utils';
import { RINCEL_COIN_TYPE } from '../sui.config';
import { getCoinManager, getWalletManager, randomUuid } from '../sui.functions';
import {
  coinCannotBeSoldDueToDelay,
  extractCoinTypeFromLink,
  findCoinInAssets,
  getPriceOutputData,
  getSuiScanCoinLink,
  getSuiVisionTransactionLink,
  isValidCoinLink,
  reactOnUnexpectedBehaviour,
} from '../utils';
import { SwapSide } from './types';
import { getBestRouteTransactionDataWithExternal, printSwapInfo } from './utils';

async function askForCoinToSell({
  ctx,
  conversation,
  coinManager,
  allCoinsAssets,
}: {
  ctx: BotContext;
  conversation: MyConversation;
  coinManager: CoinManagerSingleton;
  allCoinsAssets: CoinAssetData[];
}) {
  const coinButtonsWithCloseKeyboard = getTwoButtonsInColumn(whitelistCoinsKeyboard, closeConversation);

  await ctx.reply(
    '💸 What <b>coin</b> do you want to <b>sell</b>?\n\nPlease, <b>choose the coin</b> with buttons below or send a ' +
      '<b>coin type</b> or a <b>link to Suiscan</b> of a different <b>coin</b>.',
    {
      reply_markup: coinButtonsWithCloseKeyboard,
      parse_mode: 'HTML',
    },
  );

  await ctx.reply(
    'Example of coin type format:\n' +
      `<code>${RINCEL_COIN_TYPE}</code>\n\n` +
      `Example of suiscan link:\n${getSuiScanCoinLink(RINCEL_COIN_TYPE)}`,
    { parse_mode: 'HTML' },
  );

  let resultCoin: CoinAssetData | undefined;

  await conversation.waitUntil(async (ctx) => {
    const callbackQueryData = ctx.callbackQuery?.data;
    if (callbackQueryData === 'close-conversation') {
      return false;
    }

    let possibleCoin = ctx.msg?.text ?? '';

    if (callbackQueryData !== undefined && coinCallbackQueriesData.includes(callbackQueryData)) {
      await ctx.answerCallbackQuery();

      const coinIndex = getWhitelistCoinIndexFromCallbackQueryData(callbackQueryData);
      possibleCoin = coinWhitelist[coinIndex].type;
    }

    const coinTypeIsValid = isValidTokenAddress(possibleCoin);
    const suiScanLinkIsValid = isValidCoinLink(possibleCoin);

    if (!coinTypeIsValid && !suiScanLinkIsValid) {
      const replyText =
        'Token address or suiscan link is not correct. Make sure inputed data is correct.\n\n' +
        'You can enter a token address or a Suiscan link.';

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

    const tokenToSellIsSui: boolean = isSuiCoinType(fetchedCoin.type);

    if (tokenToSellIsSui) {
      await ctx.reply(`You cannot sell SUI for SUI. Please, specify another token to sell.`, {
        reply_markup: closeConversation,
      });

      return false;
    }

    const foundCoin = findCoinInAssets(allCoinsAssets, coinType);

    if (foundCoin === undefined) {
      await ctx.reply('Token is not found in your wallet assets. Please, specify another token to sell.', {
        reply_markup: closeConversation,
      });

      return false;
    }

    if (await coinCannotBeSoldDueToDelay({ coin: foundCoin, conversation, ctx })) {
      return false;
    }

    resultCoin = foundCoin;
    conversation.session.tradeCoin.coinType = foundCoin.type;

    return true;
  });

  return resultCoin;
}

async function askForPercentageToSell(
  ctx: BotContext,
  conversation: MyConversation,
  validCoinToSell: CoinAssetData,
  priceOutput: string,
) {
  await ctx.reply(
    `${priceOutput}Enter the percentage of <b>${validCoinToSell.symbol || validCoinToSell.type}</b> amount ` +
      `you wish to sell (<code>0</code> - <code>100</code>%):`,
    { reply_markup: closeConversation, parse_mode: 'HTML' },
  );

  let result: string = '0';
  await conversation.waitUntil(async (ctx) => {
    if (ctx.callbackQuery?.data === 'close-conversation') {
      return false;
    }

    const percentage = parseFloat(ctx.msg?.text ?? '');

    if (isNaN(percentage)) {
      await ctx.reply('Percentage must be a number. Please, enter a valid value.', { reply_markup: closeConversation });

      return false;
    }

    if (percentage <= 0) {
      await ctx.reply(`Percentage must be greater than <code>0</code>. Please, enter a valid value.`, {
        reply_markup: closeConversation,
        parse_mode: 'HTML',
      });

      return false;
    }

    if (percentage > 100) {
      await ctx.reply(`Maximum percentage is <code>100</code>. Please, enter a valid value.`, {
        reply_markup: closeConversation,
        parse_mode: 'HTML',
      });

      return false;
    }

    result = percentage.toString();

    return true;
  });

  conversation.session.tradeCoin.tradeAmountPercentage = result;
}

export async function sell(conversation: MyConversation, ctx: BotContext): Promise<void> {
  const retryButton = retryAndGoHomeButtonsData[CommonConversationId.Sell];

  const availableBalance = await conversation.external(async () => {
    const walletManager = await getWalletManager();
    // TODO: Maybe we should add try/catch here as well
    const balance = await walletManager.getAvailableSuiBalance(conversation.session.publicKey);

    return balance;
  });

  const suiAmountIsValid = +availableBalance > 0;

  if (!suiAmountIsValid) {
    await ctx.reply("You don't have enough SUI for transaction gas. Please, top up your SUI balance to continue.", {
      reply_markup: retryButton,
    });

    return;
  }

  const coinManager = await getCoinManager();

  const allCoinsAssets = await conversation.external(async () => {
    const walletManager = await getWalletManager();
    // TODO: Maybe we should add try/catch here as well
    const coinAssets = await walletManager.getAllCoinAssets(conversation.session.publicKey);

    return coinAssets;
  });

  let validCoinToSell: CoinAssetData | undefined;

  if (!conversation.session.tradeCoin.coinType) {
    validCoinToSell = await askForCoinToSell({
      allCoinsAssets,
      coinManager,
      conversation,
      ctx,
    });
  } else {
    const coinType = ctx.session.tradeCoin.coinType;
    const validatedCoin = await coinManager.getCoinByType2(coinType);

    if (validatedCoin === null) {
      await ctx.reply(
        `Coin type not found. Make sure type "${coinType}" is correct.\n\nYou can enter a coin type or a Suiscan link.`,
        { reply_markup: closeConversation },
      );
    }

    validCoinToSell = findCoinInAssets(allCoinsAssets, coinType);
  }

  if (validCoinToSell === undefined) {
    await ctx.reply('Token is not found in your wallet assets. Please, specify another token to sell.', {
      reply_markup: closeConversation,
    });

    return;
  }

  if (
    await coinCannotBeSoldDueToDelay({
      coin: validCoinToSell,
      conversation,
      ctx,
    })
  ) {
    return;
  }

  const priceOutput = await conversation.external({
    args: [validCoinToSell],
    task: (coin: CoinAssetData) => getPriceOutputData(coin),
  });

  if (conversation.session.tradeCoin.tradeAmountPercentage === '0') {
    await askForPercentageToSell(ctx, conversation, validCoinToSell, priceOutput);
  }

  if (parseFloat(conversation.session.tradeCoin.tradeAmountPercentage) === 100) {
    await ctx.reply(
      `You are about to sell <i><b>the entire amount</b></i> of your ` +
        `<b>${validCoinToSell.symbol || validCoinToSell.type}</b> balance.`,
      { reply_markup: confirmWithCloseKeyboard, parse_mode: 'HTML' },
    );

    const confirmContext = await conversation.wait();
    const confirmCallbackQueryData = confirmContext.callbackQuery?.data;

    if (confirmCallbackQueryData === CallbackQueryData.Cancel) {
      await confirmContext.answerCallbackQuery();

      await askForPercentageToSell(ctx, conversation, validCoinToSell, priceOutput);
    } else if (confirmCallbackQueryData === CallbackQueryData.Confirm) {
      await confirmContext.answerCallbackQuery();
    } else {
      await reactOnUnexpectedBehaviour(confirmContext, retryButton, 'sell');
      return;
    }
  }

  const absolutePercentage = new BigNumber(conversation.session.tradeCoin.tradeAmountPercentage).dividedBy(100);

  const amountToSell = new BigNumber(validCoinToSell.balance).multipliedBy(absolutePercentage).toString();

  await ctx.reply('Finding the best route to save your money… ☺️');

  const data = await getBestRouteTransactionDataWithExternal({
    conversation,
    ctx,
    methodParams: {
      tokenFrom: validCoinToSell.type,
      tokenTo: LONG_SUI_COIN_TYPE,
      amount: amountToSell,
      signerAddress: conversation.session.publicKey,
      slippagePercentage: conversation.session.settings.slippagePercentage,
    },
  });

  if (data === undefined) {
    await ctx.reply('Transaction creation failed ❌', {
      reply_markup: retryButton,
    });

    return;
  }

  const { outputAmount, providerName, tx: transaction } = data;

  await printSwapInfo({
    ctx,
    conversation,
    formattedInputAmount: amountToSell,
    outputAmount: outputAmount,
    providerName: providerName,
    side: SwapSide.Sell,
  });

  if (conversation.session.settings.swapWithConfirmation) {
    const confirmContext = await conversation.wait();
    const callbackQueryData = confirmContext.callbackQuery?.data;

    if (callbackQueryData === CallbackQueryData.Cancel) {
      await conversation.skip();
    } else if (callbackQueryData !== CallbackQueryData.Confirm) {
      await reactOnUnexpectedBehaviour(ctx, retryButton, 'sell');
      return;
    }

    await confirmContext.answerCallbackQuery();
  }

  await ctx.reply('Sending transaction... 🔄' + randomUuid);

  const resultOfSwap = await signAndExecuteTransaction({
    conversation,
    ctx,
    transaction,
  });

  if (resultOfSwap.result === 'success' && resultOfSwap.digest) {
    await ctx.reply(`Swap <a href="${getSuiVisionTransactionLink(resultOfSwap.digest)}">successful</a> ✅`, {
      reply_markup: retryButton,
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
    });

    conversation.session.tradesCount = conversation.session.tradesCount + 1;

    return;
  }

  if (resultOfSwap.result === 'failure' && resultOfSwap.digest) {
    await ctx.reply(`Swap <a href="${getSuiVisionTransactionLink(resultOfSwap.digest)}">failed</a> ❌`, {
      reply_markup: retryButton,
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
    });

    // TODO: It doesn't work for now. Come back later and fix.
    /*
    const continueContext = await conversation.waitFor('callback_query:data');
    const continueCallbackQueryData = continueContext.callbackQuery.data;
    if (continueCallbackQueryData === 'change-slippage-retry') {
      await showSlippageConfiguration(ctx);
      const result = await conversation.waitFor('callback_query:data');
      const newSlippage = parseInt(result.callbackQuery.data.split('-')[1]);
      if (!isNaN(newSlippage)) {
        //If not a number means that the user choose home option
        conversation.session.settings.slippagePercentage = newSlippage;
        instantSell(conversation, ctx, tradeAmountPercentage, resCoinType);
      }
    }
    */

    return;
  }

  await ctx.reply('Transaction sending failed. ❌', {
    reply_markup: retryButton,
  });
}
