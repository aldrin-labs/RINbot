import { DCAManagerSingleton } from '@avernikoz/rinbot-sui-sdk';
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
import { TransactionResultStatus } from '../../sui.functions';
import { getSuiScanTransactionLink } from '../../utils';
import { MIN_ORDERS_COUNT_TO_ADD } from '../constants';

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

  const totalOrdersContext = await conversation.waitFor('message:text');
  const totalOrdersMessage = totalOrdersContext.msg.text;
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

  await ctx.replyFmt(
    fmt`You are about to ${bold('add')} ${code(totalOrdersInt)} ${bold('orders')}.`,
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
      addOrdersCount: totalOrdersInt,
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
