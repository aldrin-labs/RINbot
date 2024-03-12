import {
  DCAManagerSingleton,
  isValidTokenAmount,
} from '@avernikoz/rinbot-sui-sdk';
import BigNumber from 'bignumber.js';
import closeConversation from '../../../inline-keyboards/closeConversation';
import confirm from '../../../inline-keyboards/confirm';
import { retryAndGoHomeButtonsData } from '../../../inline-keyboards/retryConversationButtonsFactory';
import showActiveDCAsKeyboard from '../../../inline-keyboards/showActiveDCAs';
import yesOrNo from '../../../inline-keyboards/yesOrNo';
import { BotContext, MyConversation } from '../../../types';
import { CallbackQueryData } from '../../../types/callback-queries-data';
import { ConversationId } from '../../conversations.config';
import {
  getTransactionFromMethod,
  signAndExecuteTransaction,
} from '../../conversations.utils';
import { USDC_COIN_TYPE } from '../../sui.config';
import { TransactionResultStatus } from '../../sui.functions';
import { getSuiScanTransactionLink } from '../../utils';
import { MIN_SELL_USD_PER_ORDER } from '../constants';

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

  // Test data
  const baseCoinSymbol = 'USDC';
  const baseCoinDecimals = 6;
  const baseBalance = (21.649).toString();
  const currentTotalOrdersCount = 15;
  const dcaId = '123';
  const baseCoinType = USDC_COIN_TYPE;
  const quoteCoinType = '0x2::sui::SUI';

  const maxWithdrawAmount = new BigNumber(baseBalance)
    .minus(MIN_SELL_USD_PER_ORDER)
    .toString();

  await ctx.reply(
    `Enter the amount of *${baseCoinSymbol}* you want to withdraw from *DCA* (\`0\` - \`${maxWithdrawAmount}\`).\n\n` +
      `||*Hint*: if you want to withdraw all funds, please use *Close DCA* at *DCA* menu.||`,
    { reply_markup: closeConversation, parse_mode: 'MarkdownV2' },
  );

  let userConfirmedAmountAndOrdersCount = false;
  let resWithdrawAmount;
  let resRequiredDecreaseOrdersCount;

  do {
    const withdrawAmountContext = await conversation.wait();
    const withdrawAmountCallbackQueryData =
      withdrawAmountContext.callbackQuery?.data;
    const withdrawAmount = withdrawAmountContext.msg?.text;

    if (withdrawAmountCallbackQueryData === CallbackQueryData.Cancel) {
      await conversation.skip();
    } else if (withdrawAmount !== undefined) {
      const { isValid: amountIsValid, reason } = isValidTokenAmount({
        amount: withdrawAmount,
        maxAvailableAmount: maxWithdrawAmount,
        decimals: baseCoinDecimals,
      });

      if (!amountIsValid) {
        await ctx.reply(
          `Invalid amount. Reason: ${reason}\n\nPlease, try again.`,
          {
            reply_markup: closeConversation,
          },
        );

        continue;
      }
    } else {
      await ctx.reply(
        `Please, enter *${baseCoinSymbol}* amount you want to withdraw from *DCA*.`,
        {
          reply_markup: closeConversation,
          parse_mode: 'MarkdownV2',
        },
      );

      continue;
    }

    if (withdrawAmount === undefined) {
      await ctx.reply('Cannot process withdraw amount. Please, try again.', {
        reply_markup: closeConversation,
      });

      continue;
    }

    const remainingAfterWithdrawBalance = new BigNumber(baseBalance).minus(
      withdrawAmount,
    );
    const maxResOrdersCount = Math.floor(
      remainingAfterWithdrawBalance.toNumber(),
    );

    // TODO: Test that this scenario cannot be executed (enter max available withdraw amount)
    if (maxResOrdersCount < 1) {
      await ctx.reply('Please, enter a smaller withdraw amount.', {
        reply_markup: closeConversation,
      });

      continue;
    }

    const resOrdersCount = Math.min(maxResOrdersCount, currentTotalOrdersCount);
    const requiredDecreaseOrdersCount = new BigNumber(currentTotalOrdersCount)
      .minus(resOrdersCount)
      .toNumber();

    if (requiredDecreaseOrdersCount === 0) {
      resWithdrawAmount = withdrawAmount;
      resRequiredDecreaseOrdersCount = requiredDecreaseOrdersCount;
      userConfirmedAmountAndOrdersCount = true;
      break;
    }

    await ctx.reply(
      `You are about to withdraw *${withdrawAmount} ${baseCoinSymbol}*.\n` +
        `With this withdrawal amount, the *total orders count* will be automatically ` +
        `reduced by \`${requiredDecreaseOrdersCount}\`.\n\n` +
        `Do you want to proceed?`,
      { reply_markup: yesOrNo, parse_mode: 'MarkdownV2' },
    );

    const confirmAmountAndDecreaseOrdersContext = await conversation.waitFor(
      'callback_query:data',
    );
    const confirmAmountAndDecreaseOrdersCallbackQueryData =
      confirmAmountAndDecreaseOrdersContext.callbackQuery.data;

    if (
      confirmAmountAndDecreaseOrdersCallbackQueryData === CallbackQueryData.Yes
    ) {
      resWithdrawAmount = withdrawAmount;
      resRequiredDecreaseOrdersCount = requiredDecreaseOrdersCount;
      userConfirmedAmountAndOrdersCount = true;

      await confirmAmountAndDecreaseOrdersContext.answerCallbackQuery();

      break;
    }

    if (
      confirmAmountAndDecreaseOrdersCallbackQueryData === CallbackQueryData.No
    ) {
      await ctx.reply(
        `Please, enter another *${baseCoinSymbol}* amount to withdraw from *DCA*.`,
        { reply_markup: closeConversation, parse_mode: 'MarkdownV2' },
      );

      await confirmAmountAndDecreaseOrdersContext.answerCallbackQuery();
    }
  } while (!userConfirmedAmountAndOrdersCount);

  if (resWithdrawAmount === undefined) {
    await ctx.reply(
      'Cannot process withdraw amount. Please, try again or contact support.',
      { reply_markup: retryButton, parse_mode: 'MarkdownV2' },
    );

    return;
  }

  if (resRequiredDecreaseOrdersCount === undefined) {
    await ctx.reply(
      'Cannot process decreased orders count. Please, try again or contact support.',
      { reply_markup: retryButton, parse_mode: 'MarkdownV2' },
    );

    return;
  }

  // Asking user whether he wants to decrease total orders count
  await ctx.reply(
    `Do you want to decrease ${resRequiredDecreaseOrdersCount === 0 ? 'the' : 'more'} *total orders count*?`,
    {
      reply_markup: yesOrNo,
      parse_mode: 'MarkdownV2',
    },
  );

  const decreaseOrdersCountQuestionContext = await conversation.waitFor(
    'callback_query:data',
  );
  const decreaseOrdersCountCallbackQueryData =
    decreaseOrdersCountQuestionContext.callbackQuery.data;

  if (decreaseOrdersCountCallbackQueryData === CallbackQueryData.Yes) {
    const maxDecreaseOrdersCount = new BigNumber(currentTotalOrdersCount)
      .minus(1)
      .toString();

    await ctx.reply(
      `How much do you want to decrease the *total orders count* (\`${resRequiredDecreaseOrdersCount}\` - ` +
        `\`${maxDecreaseOrdersCount}\`)?`,
      { reply_markup: closeConversation, parse_mode: 'MarkdownV2' },
    );

    const decreaseOrdersCountContext = await conversation.wait();
    const decreaseOrdersCount = decreaseOrdersCountContext.msg?.text;
    const decreaseOrdersCallbackQueryData =
      decreaseOrdersCountContext.callbackQuery?.data;

    if (decreaseOrdersCallbackQueryData === CallbackQueryData.Cancel) {
      await conversation.skip();
    } else if (decreaseOrdersCount !== undefined) {
      const decreaseOrdersCountInt = parseInt(decreaseOrdersCount);

      if (isNaN(decreaseOrdersCountInt)) {
        await ctx.reply(
          'Total orders count must be an integer. Please, try again.',
          { reply_markup: closeConversation },
        );

        await conversation.skip({ drop: true });
      }

      const decreaseOrdersCountIsValid =
        decreaseOrdersCountInt >= resRequiredDecreaseOrdersCount &&
        decreaseOrdersCountInt <= +maxDecreaseOrdersCount;
      if (!decreaseOrdersCountIsValid) {
        await ctx.reply(
          `Minimum <b>total orders count</b> to decrease is <code>${resRequiredDecreaseOrdersCount}</code>, ` +
            `maximum &#8213; <code>${maxDecreaseOrdersCount}</code>.\n\nPlease, try again.`,
          { reply_markup: closeConversation, parse_mode: 'HTML' },
        );

        await conversation.skip({ drop: true });
      }

      resRequiredDecreaseOrdersCount = decreaseOrdersCountInt;
    } else {
      await ctx.reply(
        'Please, enter *total orders count* you want to decrease by.',
        { parse_mode: 'MarkdownV2' },
      );

      await conversation.skip({ drop: true });
    }
  } else if (decreaseOrdersCountCallbackQueryData === CallbackQueryData.No) {
    await decreaseOrdersCountQuestionContext.answerCallbackQuery();
  } else {
    await ctx.reply('Please, choose *Yes* or *No* button.', {
      reply_markup: closeConversation,
      parse_mode: 'MarkdownV2',
    });
  }

  const closeButtons = closeConversation.inline_keyboard[0];
  const confirmWithCloseKeyboard = confirm.clone().add(...closeButtons);

  // Creating transaction, signing & executing it
  // TODO: Print info about total orders count only when `resRequiredDecreaseOrdersCount` !== 0
  await ctx.reply(
    `You are about to withdraw *${resWithdrawAmount} ${baseCoinSymbol}* and decrease *total orders count* ` +
      `by ${resRequiredDecreaseOrdersCount}.`,
    { reply_markup: confirmWithCloseKeyboard, parse_mode: 'MarkdownV2' },
  );

  const finalConfirmContext = await conversation.waitFor('callback_query:data');
  const finalConfirmCallbackQueryData = finalConfirmContext.callbackQuery.data;

  if (finalConfirmCallbackQueryData === CallbackQueryData.Cancel) {
    await conversation.skip();
  }
  if (finalConfirmCallbackQueryData === CallbackQueryData.Confirm) {
    await finalConfirmContext.answerCallbackQuery();
  } else {
    await ctx.reply(
      `Please, confirm to withdraw *${baseCoinSymbol}* from *DCA*.`,
      { reply_markup: closeConversation, parse_mode: 'MarkdownV2' },
    );

    await conversation.skip({ drop: true });
  }

  const baseCoinAmountToWithdrawFromDCA = new BigNumber(resWithdrawAmount)
    .multipliedBy(10 ** baseCoinDecimals)
    .toString();

  await ctx.reply('Creating withdraw transaction...');

  const transaction = await getTransactionFromMethod({
    conversation,
    ctx,
    method: DCAManagerSingleton.getDCAWithdrawBaseTransaction,
    params: {
      dca: dcaId,
      baseCoinAmountToWithdrawFromDCA,
      baseCoinType,
      quoteCoinType,
      removeOrdersCount: resRequiredDecreaseOrdersCount,
    },
  });

  if (transaction === undefined) {
    await ctx.reply(
      'Cannot create transaction to withdraw from *DCA*. Please, try again or contact support.',
      { reply_markup: retryButton, parse_mode: 'MarkdownV2' },
    );

    return;
  }

  await ctx.reply('Withdrawing...');

  const withdrawResult = await signAndExecuteTransaction({
    conversation,
    ctx,
    transaction,
  });

  if (
    withdrawResult.result === TransactionResultStatus.Success &&
    withdrawResult.digest !== undefined
  ) {
    const retryButtons = retryButton.inline_keyboard[0];
    const showWithRetryKeyboard = showActiveDCAsKeyboard
      .clone()
      .row()
      .add(...retryButtons);

    await ctx.reply(
      `*${baseCoinSymbol}* is [successfully withdrawed](${getSuiScanTransactionLink(withdrawResult.digest)})!`,
      { reply_markup: showWithRetryKeyboard, parse_mode: 'MarkdownV2' },
    );

    return;
  }

  if (
    withdrawResult.result === TransactionResultStatus.Failure &&
    withdrawResult.digest !== undefined
  ) {
    await ctx.reply(
      `[Failed](${getSuiScanTransactionLink(withdrawResult.digest)}) to withdraw *${baseCoinSymbol}*.`,
      { reply_markup: retryButton, parse_mode: 'MarkdownV2' },
    );

    return;
  }

  await ctx.reply(`Failed to withdraw *${baseCoinSymbol}*.`, {
    reply_markup: retryButton,
    parse_mode: 'MarkdownV2',
  });

  return;

  /**
   * base_balance = 17.83
   * cur_remaining_orders = 4
   * sell_per_order = base_balance / cur_remaining_orders = 4.4575
   *
   * withdraw_amount = 5
   * remaining_base_balance = base_balance - withdraw_amount = 12.83
   * sell_per_order_after_withdraw = remaining_base_balance / cur_remaining_orders = 3.2075
   *
   * withdraw_amount = 14
   * remaining_base_balance = base_balance - withdraw_amount = 3.83
   * sell_per_order_after_withdraw = remaining_base_balance / cur_remaining_orders = 0.9575
   */

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
}
