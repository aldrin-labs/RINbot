import { DCAManagerSingleton, SUI_DECIMALS } from '@avernikoz/rinbot-sui-sdk';
import { bold, code, fmt, link } from '@grammyjs/parse-mode';
import BigNumber from 'bignumber.js';
import closeConversation from '../../../inline-keyboards/closeConversation';
import confirmWithCloseKeyboard from '../../../inline-keyboards/confirm-with-close';
import { retryAndGoHomeButtonsData } from '../../../inline-keyboards/retryConversationButtonsFactory';
import showActiveDCAsKeyboard from '../../../inline-keyboards/showActiveDCAs';
import { BotContext, MyConversation } from '../../../types';
import { CallbackQueryData } from '../../../types/callback-queries-data';
import { ConversationId } from '../../conversations.config';
import {
  getTransactionFromMethod,
  signAndExecuteTransaction,
} from '../../conversations.utils';
import { TransactionResultStatus, getWalletManager } from '../../sui.functions';
import { getSuiScanTransactionLink } from '../../utils';
import {
  MIN_ORDERS_COUNT_TO_ADD,
  ONE_TRADE_GAS_FEE_IN_MIST,
} from '../constants';

export async function increaseOrders(
  conversation: MyConversation,
  ctx: BotContext,
): Promise<void> {
  const retryButton =
    retryAndGoHomeButtonsData[ConversationId.IncreaseDcaOrders];

  const { currentIndex, objects } = ctx.session.dcas;
  // TODO: Make this more explicit
  const dca = objects[currentIndex ?? 0];
  const {
    base_coin_type: baseCoinType,
    base_coin_decimals: baseCoinDecimals,
    quote_coin_type: quoteCoinType,
  } = dca.fields;
  const dcaId = dca.fields.id.id;
  const currentTotalOrdersCount = +dca.fields.remaining_orders;
  const baseBalance = new BigNumber(dca.fields.base_balance).dividedBy(
    10 ** baseCoinDecimals,
  );

  const maxTotalOrdersCount = Math.floor(baseBalance.toNumber());
  const availableToAddOrdersCount = new BigNumber(maxTotalOrdersCount)
    .minus(currentTotalOrdersCount)
    .toString();

  if (availableToAddOrdersCount === '0') {
    await ctx.replyFmt(
      fmt`${bold('Total orders count')} is maximum on this ${bold('DCA')}.`,
      { reply_markup: showActiveDCAsKeyboard },
    );

    return;
  }

  await ctx.reply(
    `<b>How much orders</b> do you want to add?\n\n<b>Min</b>: <code>${MIN_ORDERS_COUNT_TO_ADD}</code>\n<b>Max</b>: ` +
      `<code>${availableToAddOrdersCount}</code>`,
    { reply_markup: closeConversation, parse_mode: 'HTML' },
  );

  let totalOrders;
  let userConfirmedTotalOrdersCount = false;

  do {
    const totalOrdersContext = await conversation.wait();
    const totalOrdersCallbackQueryData = totalOrdersContext.callbackQuery?.data;
    const totalOrdersMessage = totalOrdersContext.msg?.text;

    if (totalOrdersCallbackQueryData === CallbackQueryData.Cancel) {
      await conversation.skip();
    }
    if (totalOrdersMessage !== undefined) {
      const totalOrdersInt = parseInt(totalOrdersMessage);

      if (isNaN(totalOrdersInt)) {
        await ctx.reply(
          'Total orders count must be an integer. Please, try again.',
          { reply_markup: closeConversation },
        );

        await conversation.skip({ drop: true });
      }

      const totalOrdersIsValid =
        totalOrdersInt >= MIN_ORDERS_COUNT_TO_ADD &&
        totalOrdersInt <= +availableToAddOrdersCount;

      if (!totalOrdersIsValid) {
        await ctx.reply(
          `Minimum <b>total orders count</b> to add is <code>1</code>, maximum &#8213; ` +
            `<code>${availableToAddOrdersCount}</code>.\n\nPlease, try again.`,
          { reply_markup: closeConversation, parse_mode: 'HTML' },
        );

        await conversation.skip({ drop: true });
      }

      totalOrders = totalOrdersInt;
    } else {
      await ctx.replyFmt(
        fmt`Please, enter the ${bold('total orders count')} you want to add.`,
        { reply_markup: closeConversation },
      );

      await conversation.skip({ drop: true });
    }

    if (totalOrders === undefined) {
      await ctx.replyFmt(
        fmt`Cannot process ${bold('total orders count')}. Please, try again or contact support.`,
        { reply_markup: retryButton },
      );

      return;
    }

    const availableSuiBalance = await conversation.external(async () => {
      const walletManager = await getWalletManager();
      // TODO: Maybe we should add try/catch here as well
      const balance = await walletManager.getAvailableSuiBalance(
        ctx.session.publicKey,
      );

      return balance;
    });

    const gasAmountForTrades = new BigNumber(ONE_TRADE_GAS_FEE_IN_MIST)
      .dividedBy(10 ** SUI_DECIMALS)
      .multipliedBy(totalOrders)
      .toString();

    const userHasNotEnoughSui = new BigNumber(availableSuiBalance).isLessThan(
      gasAmountForTrades,
    );

    if (userHasNotEnoughSui) {
      await ctx.replyFmt(
        fmt([
          fmt`To add ${code(totalOrders)} ${bold('total orders')}, you need at least ${code(gasAmountForTrades)} ${bold('SUI')}.\n`,
          fmt`Now your available balance is ${code(availableSuiBalance)} ${bold('SUI')}.\n\nPlease, enter another count of ${bold('total orders')} to add `,
          fmt`or top up your ${bold('SUI')} balance.`,
        ]),
        { reply_markup: closeConversation },
      );

      await conversation.skip({ drop: true });
    }

    await ctx.replyFmt(
      fmt([
        fmt`For ${code(totalOrders)} ${bold('total orders')} ${code(gasAmountForTrades)} ${bold('SUI')} `,
        fmt`will be deducted from your balance.`,
      ]),
      { reply_markup: confirmWithCloseKeyboard },
    );

    const confirmTotalOrdersContext = await conversation.waitFor(
      'callback_query:data',
    );
    const confirmTotalOrdersCallbackQueryData =
      confirmTotalOrdersContext.callbackQuery.data;

    if (confirmTotalOrdersCallbackQueryData === CallbackQueryData.Cancel) {
      await conversation.skip();
    }
    if (confirmTotalOrdersCallbackQueryData === CallbackQueryData.Confirm) {
      userConfirmedTotalOrdersCount = true;
      await confirmTotalOrdersContext.answerCallbackQuery();

      break;
    } else {
      await ctx.replyFmt(
        fmt`Please, confirm specified ${bold('total orders count')} to add.`,
        { reply_markup: closeConversation },
      );

      await confirmTotalOrdersContext.answerCallbackQuery();
    }
  } while (!userConfirmedTotalOrdersCount);

  await ctx.replyFmt(
    fmt`You are about to ${bold('add')} ${code(totalOrders)} ${bold('orders')}.`,
    { reply_markup: confirmWithCloseKeyboard },
  );

  const confirmContext = await conversation.waitFor('callback_query:data');
  const confirmCallbackQueryData = confirmContext.callbackQuery.data;

  if (confirmCallbackQueryData === CallbackQueryData.Cancel) {
    await conversation.skip();
  }
  if (confirmCallbackQueryData === CallbackQueryData.Confirm) {
    await confirmContext.answerCallbackQuery();
  } else {
    await ctx.reply(`Please, confirm or cancel orders count increasing.`, {
      reply_markup: closeConversation,
    });

    await conversation.skip({ drop: true });
  }

  await ctx.replyFmt(fmt`${bold('Creating transaction...')}`);

  const transaction = await getTransactionFromMethod({
    conversation,
    ctx,
    method: DCAManagerSingleton.getDCAIncreaseOrdersRemainingTransaction,
    params: {
      baseCoinType,
      quoteCoinType,
      dca: dcaId,
      addOrdersCount: totalOrders,
    },
  });

  if (transaction === undefined) {
    await ctx.reply(
      'Failed to create transaction for total orders count increasing. Please, try again or contact support.',
      { reply_markup: retryButton },
    );

    return;
  }

  await ctx.replyFmt(fmt`${bold('Increasing total orders count...')}`);

  const result = await signAndExecuteTransaction({
    conversation,
    ctx,
    transaction,
  });

  if (
    result.result === TransactionResultStatus.Success &&
    result.digest !== undefined
  ) {
    const retryButtons = retryButton.inline_keyboard[0];
    const showWithRetryKeyboard = showActiveDCAsKeyboard
      .clone()
      .row()
      .add(...retryButtons);

    await ctx.replyFmt(
      fmt`${bold('Total orders count')} is ${link('successfully increased', getSuiScanTransactionLink(result.digest))}!`,
      { reply_markup: showWithRetryKeyboard },
    );

    return;
  }

  if (
    result.result === TransactionResultStatus.Failure &&
    result.digest !== undefined
  ) {
    await ctx.replyFmt(
      fmt`${link('Failed', getSuiScanTransactionLink(result.digest))} to increase ${bold('total orders count')}.`,
      { reply_markup: retryButton },
    );

    return;
  }

  await ctx.replyFmt(fmt`Failed to increase ${bold('total orders count')}.`, {
    reply_markup: retryButton,
  });

  return;
}
