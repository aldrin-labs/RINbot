import { DCAManagerSingleton, DCATimescale } from '@avernikoz/rinbot-sui-sdk';
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
import { getSuiScanCoinLink, getSuiScanTransactionLink } from '../../utils';

export async function closeDca(
  conversation: MyConversation,
  ctx: BotContext,
): Promise<void> {
  const retryButton = retryAndGoHomeButtonsData[ConversationId.CloseDca];

  const { currentIndex, objects } = ctx.session.dcas;
  // TODO: Make this more explicit
  const dca = objects[currentIndex ?? 0];
  const {
    base_coin_symbol: baseCoinSymbol,
    quote_coin_symbol: quoteCoinSymbol,
    base_coin_type: baseCoinType,
    base_coin_decimals: baseCoinDecimals,
    quote_coin_type: quoteCoinType,
    every,
    time_scale,
  } = dca.fields;
  const dcaId = dca.fields.id.id;
  const currentTotalOrdersCount = +dca.fields.remaining_orders;
  const baseBalance = new BigNumber(dca.fields.input_balance)
    .dividedBy(10 ** baseCoinDecimals)
    .toString();
  const timeAmount = every;
  const timeUnitName = Object.values(DCATimescale)
    [time_scale].toString()
    .toLowerCase();

  await ctx.replyFmt(
    fmt([
      fmt`📊 ${bold('DCA Stats')} 📊\n\n`,
      fmt`${bold(link(baseCoinSymbol, getSuiScanCoinLink(baseCoinType)))} to `,
      fmt`${bold(link(quoteCoinSymbol, getSuiScanCoinLink(quoteCoinType)))}\n`,
      fmt`${bold(`Remaining ${baseCoinSymbol} balance`)}: ${code(baseBalance)} ${bold(baseCoinSymbol)}\n`,
      fmt`${bold('Remaining orders')}: ${code(currentTotalOrdersCount)}\n`,
      fmt`${bold('Buy every')}: ${timeAmount} ${timeUnitName}\n\n`,
      fmt`Are you sure you want to ${bold(`close DCA and withdraw all ${baseCoinSymbol}`)}?`,
    ]),
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
    await ctx.replyFmt(fmt`Please, confirm or cancel ${bold('DCA')} closure.`, {
      reply_markup: closeConversation,
    });

    await conversation.skip({ drop: true });
  }

  await ctx.replyFmt(fmt`${bold('Creating transaction...')}`);

  const transaction = await getTransactionFromMethod({
    conversation,
    ctx,
    method: DCAManagerSingleton.getDCARedeemFundsAndCloseTransaction,
    params: {
      baseCoinType,
      quoteCoinType,
      dca: dcaId,
    },
  });

  if (transaction === undefined) {
    await ctx.replyFmt(
      fmt`Failed to create transaction for ${bold('DCA')} closure.`,
      { reply_markup: retryButton },
    );

    return;
  }

  await ctx.replyFmt(fmt`${bold('Closing and withdrawing...')}`);

  const result = await signAndExecuteTransaction({
    conversation,
    ctx,
    transaction,
  });

  if (
    result.result === TransactionResultStatus.Success &&
    result.digest !== undefined
  ) {
    await ctx.replyFmt(
      fmt`${bold('DCA')} is ${link('successfully closed.', getSuiScanTransactionLink(result.digest))}!`,
      { reply_markup: showActiveDCAsKeyboard },
    );

    return;
  }

  if (
    result.result === TransactionResultStatus.Failure &&
    result.digest !== undefined
  ) {
    await ctx.replyFmt(
      fmt`${link('Failed', getSuiScanTransactionLink(result.digest))} to close ${bold('DCA')}.`,
      { reply_markup: retryButton },
    );

    return;
  }

  await ctx.replyFmt(fmt`Failed to close ${bold('DCA')}.`, {
    reply_markup: retryButton,
  });

  return;
}
