import { FeeManager, LONG_SUI_COIN_TYPE, SUI_DECIMALS } from '@avernikoz/rinbot-sui-sdk';
import { EXTERNAL_WALLET_ADDRESS_TO_STORE_FEES } from '../../../config/bot.config';
import { retryAndGoHomeButtonsData } from '../../../inline-keyboards/retryConversationButtonsFactory';
import { BotContext, MyConversation } from '../../../types';
import { CallbackQueryData } from '../../../types/callback-queries-data';
import { ConversationId } from '../../conversations.config';
import { signAndExecuteTransactionWithoutConversation } from '../../conversations.utils';
import { getUserFeePercentage } from '../../fees/utils';
import { TransactionResultStatus, randomUuid } from '../../sui.functions';
import { getSuiVisionTransactionLink, reactOnUnexpectedBehaviour, userMustUseCoinWhitelist } from '../../utils';
import { SwapSide } from '../types';
import { getBestRouteTransactionDataWithExternal, printSwapInfo } from '../utils';
import { askForAmountToSpendOnBuy, askForCoinToBuy } from './utils';

export async function buy(conversation: MyConversation, ctx: BotContext) {
  const retryButton = retryAndGoHomeButtonsData[ConversationId.Buy];
  const useSpecifiedCoin = await conversation.external(() => conversation.session.tradeCoin.useSpecifiedCoin);
  const coinType = conversation.session.tradeCoin.coinType;

  let buyCoinType: string | undefined;

  if (useSpecifiedCoin) {
    buyCoinType = coinType;
    conversation.session.tradeCoin.useSpecifiedCoin = false;
  } else {
    buyCoinType = await askForCoinToBuy({ ctx, conversation, retryButton });
  }

  conversation.session.tradeCoin = {
    coinType: buyCoinType,
    tradeAmountPercentage: '0',
    useSpecifiedCoin: false,
  };

  // const amount = await askForAmountToSpendOnBuy({ conversation, ctx, buyCoinType, retryButton });

  // conversation.session.tradeCoin.tradeAmountPercentage = amount;

  return await instantBuy(conversation, ctx);
}

/**
 * Makes buy with params specified in `session.tradeCoin`.
 */
export const instantBuy = async (conversation: MyConversation, ctx: BotContext) => {
  const retryButton = retryAndGoHomeButtonsData[ConversationId.InstantBuy];

  await ctx.reply('Finding the best route to save your money… ☺️' + randomUuid);

  const {
    publicKey,
    tradeCoin: { coinType, tradeAmountPercentage },
    settings: { swapWithConfirmation, slippagePercentage },
  } = conversation.session;

  const feePercentage = (await getUserFeePercentage(ctx)).toString();
  const feeAmount = FeeManager.calculateFeeAmountIn({
    feePercentage,
    amount: tradeAmountPercentage,
    tokenDecimals: SUI_DECIMALS,
  });

  const data = await getBestRouteTransactionDataWithExternal({
    conversation,
    ctx,
    methodParams: {
      tokenFrom: LONG_SUI_COIN_TYPE,
      tokenTo: coinType,
      amount: tradeAmountPercentage,
      signerAddress: publicKey,
      slippagePercentage: slippagePercentage,
      fee: {
        feeAmount,
        feeCollectorAddress: EXTERNAL_WALLET_ADDRESS_TO_STORE_FEES,
      },
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
    formattedInputAmount: tradeAmountPercentage,
    outputAmount: outputAmount,
    providerName: providerName,
    side: SwapSide.Buy,
  });

  if (swapWithConfirmation) {
    const confirmContext = await conversation.wait();
    const callbackQueryData = confirmContext.callbackQuery?.data;

    if (callbackQueryData === CallbackQueryData.Cancel) {
      await conversation.skip();
    } else if (callbackQueryData !== CallbackQueryData.Confirm) {
      await reactOnUnexpectedBehaviour(ctx, retryButton, 'buy');
      return;
    }

    await confirmContext.answerCallbackQuery();
  }

  await ctx.reply('Sending transaction... 🔄' + randomUuid);

  const resultOfSwap = await signAndExecuteTransactionWithoutConversation({
    ctx,
    transaction,
  });

  if (resultOfSwap.result === TransactionResultStatus.Success && resultOfSwap.digest !== undefined) {
    await ctx.reply(`Swap <a href="${getSuiVisionTransactionLink(resultOfSwap.digest)}">successful</a> ✅`, {
      reply_markup: retryButton,
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
    });

    conversation.session.tradesCount = conversation.session.tradesCount + 1;

    if (userMustUseCoinWhitelist(ctx)) {
      conversation.session.trades[coinType] = {
        lastTradeTimestamp: Date.now(),
      };
    }

    return;
  }

  if (resultOfSwap.result === TransactionResultStatus.Failure && resultOfSwap.digest !== undefined) {
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
