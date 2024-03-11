import BigNumber from 'bignumber.js';
import closeConversation from '../../../inline-keyboards/closeConversation';
import { retryAndGoHomeButtonsData } from '../../../inline-keyboards/retryConversationButtonsFactory';
import { BotContext, MyConversation } from '../../../types';
import { ConversationId } from '../../conversations.config';
import { CallbackQueryData } from '../../../types/callback-queries-data';
import { isValidTokenAmount } from '@avernikoz/rinbot-sui-sdk';

export async function withdrawDcaBase(
  conversation: MyConversation,
  ctx: BotContext,
): Promise<void> {
  const retryButton = retryAndGoHomeButtonsData[ConversationId.WithdrawDcaBase];

  const { currentIndex, objects } = ctx.session.dcas;
  // TODO: Make this more explicit
  // const dca = objects[currentIndex ?? 0];
  // const {
  //   base_coin_symbol: baseCoinSymbol,
  //   base_coin_type: baseCoinType,
  //   base_coin_decimals: baseCoinDecimals,
  //   quote_coin_type: quoteCoinType,
  // } = dca.fields;
  // const dcaId = dca.fields.id.id;
  // const currentTotalOrdersCount = +dca.fields.remaining_orders;
  // const baseBalance = new BigNumber(dca.fields.base_balance)
  //   .dividedBy(10 ** baseCoinDecimals)
  //   .toString();
  const baseCoinSymbol = 'USDC';
  const baseCoinDecimals = 6;
  const baseBalance = (3).toString();

  await ctx.reply(
    `Enter the amount of *${baseCoinSymbol}* you want to withdraw from *DCA* (\`0\` - \`${baseBalance}\`).`,
    { reply_markup: closeConversation, parse_mode: 'Markdown' },
  );

  const withdrawAmountContext = await conversation.wait();
  const withdrawAmountCallbackQueryData =
    withdrawAmountContext.callbackQuery?.data;
  const withdrawAmount = withdrawAmountContext.msg?.text;

  if (withdrawAmountCallbackQueryData === CallbackQueryData.Cancel) {
    await conversation.skip();
  } else if (withdrawAmount !== undefined) {
    const { isValid: amountIsValid, reason } = isValidTokenAmount({
      amount: withdrawAmount,
      maxAvailableAmount: baseBalance,
      decimals: baseCoinDecimals,
    });

    if (!amountIsValid) {
      await ctx.reply(
        `Invalid amount. Reason: ${reason}\n\nPlease, try again.`,
        {
          reply_markup: closeConversation,
        },
      );

      await conversation.skip({ drop: true });
    }
  } else {
    await ctx.reply(
      `Please, enter *${baseCoinSymbol}* amount you want to withdraw from *DCA*.`,
      {
        reply_markup: closeConversation,
        parse_mode: 'Markdown',
      },
    );

    await conversation.skip({ drop: true });
  }

  /**
   * base_balance = 17.83
   * cur_remaining_orders = 4
   * withdraw_amount = 16.95
   * remaining_balance = base_balance - withdraw_amount = 0.88
   * max_res_orders_count = Math.floor(0.88) = 0
   * max_res_orders_count < 1, so DCA deactivated/closed. Please, confirm (ask to user)
   *
   * base_balance = 17.83
   * cur_remaining_orders = 17
   * withdraw_amount = 15.27
   * remaining_balance = base_balance - withdraw_amount = 2.56
   * max_res_orders_count = Math.floor(2.56) = 2
   * res_orders_count = Math.min(max_res_orders_count, cur_remaining_orders) = 2
   * auto_decrease_orders_count = cur_remaining_orders - res_orders_count = 15
   *
   * base_balance = 107.11
   * cur_remaining_orders = 15
   * withdraw_amount = 10
   * remaining_balance = base_balance - withdraw_amount = 97.11
   * Math.floor(97.11) = 97 (max_res_orders_count)
   * res_orders_count = Math.min(max_res_orders_count, cur_remaining_orders) = 15
   * auto_decrease_orders_count = cur_remaining_orders - res_orders_count = 0
   */

  await ctx.reply('Everything is fine, going out of conversation :)', {
    reply_markup: retryButton,
  });

  return;
}
