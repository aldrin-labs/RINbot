import { FeeManager, LONG_SUI_COIN_TYPE, SUI_DECIMALS } from '@avernikoz/rinbot-sui-sdk';
import { EXTERNAL_WALLET_ADDRESS_TO_STORE_FEES } from '../../../config/bot.config';
import { retryAndGoHomeButtonsData } from '../../../inline-keyboards/retryConversationButtonsFactory';
import repeatSameBuyWithHomeKeyboard from '../../../inline-keyboards/trading/repeat-buy-with-home';
import { BotContext, MyConversation } from '../../../types';
import { ConversationId } from '../../conversations.config';
import {
  getTransactionFromMethodWithoutConversation,
  signAndExecuteTransactionWithoutConversation,
} from '../../conversations.utils';
import { getUserFeePercentage } from '../../fees/utils';
import { TransactionResultStatus, getRouteManager, randomUuid } from '../../sui.functions';
import { getSuiVisionTransactionLink, userMustUseCoinWhitelist } from '../../utils';
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

  const amount = await askForAmountToSpendOnBuy({ conversation, ctx, buyCoinType, retryButton });

  conversation.session.tradeCoin.tradeAmountPercentage = amount;

  return await instantBuy(ctx, conversation);
}

export const instantBuy = async (ctx: BotContext, conversation: MyConversation | undefined = undefined) => {
  await ctx.reply('Finding the best route to save your money… ☺️' + randomUuid);
  const session = conversation?.session ?? ctx.session;

  const {
    tradeCoin: { coinType, tradeAmountPercentage },
  } = session;

  const feePercentage = (await getUserFeePercentage(ctx)).toString();
  const feeAmount = FeeManager.calculateFeeAmountIn({
    feePercentage,
    amount: tradeAmountPercentage,
    tokenDecimals: SUI_DECIMALS,
  });

  const routerManager = await getRouteManager();
  const transaction = await getTransactionFromMethodWithoutConversation({
    method: routerManager.getBestRouteTransaction.bind(routerManager) as typeof routerManager.getBestRouteTransaction,
    params: {
      tokenFrom: LONG_SUI_COIN_TYPE,
      tokenTo: coinType,
      amount: tradeAmountPercentage,
      signerAddress: session.publicKey,
      slippagePercentage: session.settings.slippagePercentage,
      fee: {
        feeAmount,
        feeCollectorAddress: EXTERNAL_WALLET_ADDRESS_TO_STORE_FEES,
      },
    },
  });

  if (transaction === undefined) {
    await ctx.reply('Transaction creation failed ❌', {
      reply_markup: repeatSameBuyWithHomeKeyboard,
    });

    return;
  }

  await ctx.reply('Route for swap found, sending transaction... 🔄' + randomUuid);

  const resultOfSwap = await signAndExecuteTransactionWithoutConversation({
    ctx,
    transaction,
  });

  if (resultOfSwap.result === TransactionResultStatus.Success && resultOfSwap.digest !== undefined) {
    await ctx.reply(`Swap <a href="${getSuiVisionTransactionLink(resultOfSwap.digest)}">successful</a> ✅`, {
      reply_markup: repeatSameBuyWithHomeKeyboard,
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
    });

    session.tradesCount = session.tradesCount + 1;

    if (userMustUseCoinWhitelist(ctx)) {
      session.trades[coinType] = {
        lastTradeTimestamp: Date.now(),
      };
    }

    return;
  }

  if (resultOfSwap.result === TransactionResultStatus.Failure && resultOfSwap.digest !== undefined) {
    await ctx.reply(`Swap <a href="${getSuiVisionTransactionLink(resultOfSwap.digest)}">failed</a> ❌`, {
      reply_markup: repeatSameBuyWithHomeKeyboard,
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
    reply_markup: repeatSameBuyWithHomeKeyboard,
  });
};
