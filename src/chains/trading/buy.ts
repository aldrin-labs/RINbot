import {
  FeeManager,
  LONG_SUI_COIN_TYPE,
  SUI_DECIMALS,
  isSuiCoinType,
  isValidTokenAddress,
  isValidTokenAmount,
} from '@avernikoz/rinbot-sui-sdk';
import { EXTERNAL_WALLET_ADDRESS_TO_STORE_FEES } from '../../config/bot.config';
import closeConversation from '../../inline-keyboards/closeConversation';
import coinWhitelistKeyboard from '../../inline-keyboards/coin-whitelist/coin-whitelist';
import { retryAndGoHomeButtonsData } from '../../inline-keyboards/retryConversationButtonsFactory';
import { BotContext, MyConversation } from '../../types';
import { CallbackQueryData } from '../../types/callback-queries-data';
import { ConversationId } from '../conversations.config';
import { getTransactionFromMethod, signAndExecuteTransaction } from '../conversations.utils';
import { getUserFeePercentage } from '../fees/utils';
import { RINBOT_CHAT_URL, RINCEL_COIN_TYPE } from '../sui.config';
import { getCoinManager, getRouteManager, getWalletManager, randomUuid } from '../sui.functions';
import {
  extractCoinTypeFromLink,
  getCoinWhitelist,
  getPriceOutputData,
  getSuiScanCoinLink,
  getSuiVisionTransactionLink,
  isValidCoinLink,
  userMustUseCoinWhitelist,
} from '../utils';

export async function buy(conversation: MyConversation, ctx: BotContext) {
  const retryButton = retryAndGoHomeButtonsData[ConversationId.Buy];
  const useSpecifiedCoin = await conversation.external(() => conversation.session.tradeCoin.useSpecifiedCoin);
  const coinType = conversation.session.tradeCoin.coinType;
  let validatedCoinType: string | undefined;

  if (useSpecifiedCoin) {
    validatedCoinType = coinType;
    conversation.session.tradeCoin.useSpecifiedCoin = false;
  } else {
    await ctx.reply('Which token do you want to buy? Please send a coin type or a link to suiscan.', {
      reply_markup: closeConversation,
    });

    await ctx.reply(
      'Example of coin type format:\n' +
        `<code>${RINCEL_COIN_TYPE}</code>\n\n` +
        `Example of suiscan link:\n${getSuiScanCoinLink(RINCEL_COIN_TYPE)}`,
      { parse_mode: 'HTML' },
    );

    const coinManager = await getCoinManager();
    await conversation.waitUntil(async (ctx) => {
      const callbackQueryData = ctx.callbackQuery?.data;
      if (
        callbackQueryData === CallbackQueryData.Cancel ||
        callbackQueryData === CallbackQueryData.CoinWhitelist ||
        callbackQueryData === CallbackQueryData.Home
      ) {
        return false;
      }

      const possibleCoin = (ctx.msg?.text || '').trim();
      const coinTypeIsValid = isValidTokenAddress(possibleCoin);
      const suiScanLinkIsValid = isValidCoinLink(possibleCoin);

      if (!coinTypeIsValid && !suiScanLinkIsValid) {
        const replyText =
          'Token address or suiscan link is not correct. Make sure inputed data is correct.\n\n' +
          'You can enter a token address or a Suiscan link.';
        await ctx.reply(replyText, { reply_markup: closeConversation });
        return false;
      }

      const coinType: string | null = coinTypeIsValid ? possibleCoin : extractCoinTypeFromLink(possibleCoin);

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
          `Coin type not found. Make sure type "${coinType}" is correct.\n\n` +
            'You can enter a coin type or a Suiscan link.',
          { reply_markup: closeConversation },
        );

        return false;
      }

      const tokenToBuyIsSui: boolean = isSuiCoinType(fetchedCoin.type);

      if (tokenToBuyIsSui) {
        await ctx.reply(`You cannot buy SUI for SUI. Please, specify another token to buy.`, {
          reply_markup: closeConversation,
        });

        return false;
      }

      if (userMustUseCoinWhitelist(ctx)) {
        const coinWhitelist = await conversation.external(() => getCoinWhitelist());

        if (coinWhitelist === null) {
          await ctx.reply('Failed to fetch coin whitelist. Please, try again later or contact support.', {
            reply_markup: closeConversation,
          });

          return false;
        }

        const requiredCoinInWhitelist = coinWhitelist.find((coin) => coin.type === fetchedCoin.type);

        if (requiredCoinInWhitelist === undefined) {
          const cancelButtons = closeConversation.inline_keyboard[0];
          const coinWhitelistWithCancelKeyboard = coinWhitelistKeyboard.clone().add(...cancelButtons);

          await ctx.reply(
            'This coin is not in the whitelist. Please, specify another one or contact support.\n\n' +
              '<span class="tg-spoiler"><b>Hint</b>: you can request coin whitelisting in ' +
              `<a href="${RINBOT_CHAT_URL}">RINbot_chat</a>.</span>`,
            {
              reply_markup: coinWhitelistWithCancelKeyboard,
              parse_mode: 'HTML',
              link_preview_options: { is_disabled: true },
            },
          );

          return false;
        }
      }

      validatedCoinType = fetchedCoin.type;

      return true;
    });
  }

  if (validatedCoinType === undefined) {
    await ctx.reply('Cannot process entered coin. Please, try again or contact support.', {
      reply_markup: retryButton,
    });

    return;
  }

  conversation.session.tradeCoin = {
    coinType: validatedCoinType,
    tradeAmountPercentage: '0',
    useSpecifiedCoin: false,
  };

  const resCoinType = validatedCoinType;
  const availableBalance = await conversation.external(async () => {
    const walletManager = await getWalletManager();
    // TODO: Maybe we should add try/catch here as well
    const balance = await walletManager.getAvailableSuiBalance(conversation.session.publicKey);
    return balance;
  });

  const priceOutput = await conversation.external(() => getPriceOutputData(resCoinType));

  await ctx.reply(
    `${priceOutput}Reply with the amount you wish to spend (<code>0</code> - ` +
      `<code>${availableBalance}</code> SUI).\n\nExample: <code>0.1</code>`,
    { reply_markup: closeConversation, parse_mode: 'HTML' },
  );

  let validatedInputAmount: string | undefined;
  await conversation.waitUntil(async (ctx) => {
    if (ctx.callbackQuery?.data === 'close-conversation') {
      return false;
    }

    const inputAmount = ctx.msg?.text;

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
      await ctx.reply(`Invalid amount. Reason: ${reason}\n\nPlease, try again.`, { reply_markup: closeConversation });

      return false;
    }

    validatedInputAmount = inputAmount;
    return true;
  });

  if (validatedInputAmount === undefined) {
    await ctx.reply(`Invalid coinType or inputAmount. Please try again or contact support.`, {
      reply_markup: retryButton,
    });

    return;
  }

  conversation.session.tradeCoin.tradeAmountPercentage = validatedInputAmount;

  return await instantBuy(conversation, ctx);
}

export const instantBuy = async (conversation: MyConversation, ctx: BotContext) => {
  await ctx.reply('Finding the best route to save your money… ☺️' + randomUuid);

  const retryButton = retryAndGoHomeButtonsData[ConversationId.InstantBuy];
  const routerManager = await getRouteManager();

  const feePercentage = (await conversation.external(() => getUserFeePercentage(ctx))).toString();

  const {
    tradeCoin: { coinType: resCoinType, tradeAmountPercentage },
  } = conversation.session;

  const feeAmount = FeeManager.calculateFeeAmountIn({
    feePercentage,
    amount: tradeAmountPercentage,
    tokenDecimals: SUI_DECIMALS,
  });

  const transaction = await getTransactionFromMethod({
    conversation,
    ctx,
    method: routerManager.getBestRouteTransaction.bind(routerManager) as typeof routerManager.getBestRouteTransaction,
    params: {
      tokenFrom: LONG_SUI_COIN_TYPE,
      tokenTo: resCoinType,
      amount: tradeAmountPercentage,
      signerAddress: conversation.session.publicKey,
      slippagePercentage: conversation.session.settings.slippagePercentage,
      fee: {
        feeAmount,
        feeCollectorAddress: EXTERNAL_WALLET_ADDRESS_TO_STORE_FEES,
      },
    },
  });

  if (transaction === undefined) {
    await ctx.reply('Transaction creation failed ❌', {
      reply_markup: retryButton,
    });

    return;
  }

  await ctx.reply('Route for swap found, sending transaction... 🔄' + randomUuid);

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

    if (userMustUseCoinWhitelist(ctx)) {
      conversation.session.trades[resCoinType] = {
        lastTradeTimestamp: Date.now(),
      };
    }

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
        instantBuy(conversation, ctx);
      }
    }
    */

    return;
  }

  await ctx.reply('Transaction sending failed ❌', {
    reply_markup: retryButton,
  });
};
