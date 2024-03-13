import {
  DCAManagerSingleton,
  SUI_DECIMALS,
  isValidTokenAmount,
} from '@avernikoz/rinbot-sui-sdk';
import { bold, code, fmt } from '@grammyjs/parse-mode';
import BigNumber from 'bignumber.js';
import closeConversation from '../../../inline-keyboards/closeConversation';
import confirmWithCloseKeyboard from '../../../inline-keyboards/confirm-with-close';
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
import { TransactionResultStatus, getWalletManager } from '../../sui.functions';
import {
  findCoinInAssets,
  getSuiScanTransactionLink,
  trimAmount,
} from '../../utils';
import {
  MAX_TOTAL_ORDERS_COUNT,
  ONE_TRADE_GAS_FEE_IN_MIST,
  ONE_TRADE_GAS_FEE_IN_SUI,
} from '../constants';

export async function depositDcaBase(
  conversation: MyConversation,
  ctx: BotContext,
): Promise<void> {
  const retryButton = retryAndGoHomeButtonsData[ConversationId.DepositDcaBase];

  const { currentIndex, objects } = ctx.session.dcas;
  // TODO: Make this more explicit
  const dca = objects[currentIndex ?? 0];
  const {
    base_coin_symbol: baseCoinSymbol,
    base_coin_type: baseCoinType,
    base_coin_decimals: baseCoinDecimals,
    quote_coin_type: quoteCoinType,
  } = dca.fields;
  const dcaId = dca.fields.id.id;
  const currentTotalOrdersCount = +dca.fields.remaining_orders;
  const baseBalance = new BigNumber(dca.fields.base_balance).dividedBy(
    10 ** baseCoinDecimals,
  );

  const lookingAtAssetsMessage = await ctx.reply(
    `Looking at your assets to find <b>${baseCoinSymbol}</b>...`,
    { parse_mode: 'HTML' },
  );

  const assets = await conversation.external(async () => {
    const walletManager = await getWalletManager();
    const coinAssets = await walletManager.getAllCoinAssets(
      ctx.session.publicKey,
    );

    return coinAssets;
  });

  const baseCoinInAssets = findCoinInAssets(assets, baseCoinType);

  if (baseCoinInAssets === undefined) {
    await ctx.api.editMessageText(
      lookingAtAssetsMessage.chat.id,
      lookingAtAssetsMessage.message_id,
      `<b>${baseCoinSymbol}</b> is not found in your assets. Please, top up your <b>${baseCoinSymbol}</b> balance to deposit into <b>DCA</b>.`,
      { reply_markup: retryButton, parse_mode: 'HTML' },
    );

    return;
  }

  const maxBaseCoinAmount = baseCoinInAssets.balance;

  await ctx.api.editMessageText(
    lookingAtAssetsMessage.chat.id,
    lookingAtAssetsMessage.message_id,
    `<b>${baseCoinSymbol}</b> is found in your assets!\n\n` +
      `Enter the <b>${baseCoinSymbol} amount</b> you want to deposit (<code>0</code> - <code>${maxBaseCoinAmount}` +
      `</code> <b>${baseCoinSymbol}</b>).\n\nExample: <code>100</code>`,
    { reply_markup: closeConversation, parse_mode: 'HTML' },
  );

  const amountContext = await conversation.wait();
  const amountMessage = amountContext.msg?.text;
  const amountCallbackQueryData = amountContext.callbackQuery?.data;

  if (amountCallbackQueryData === CallbackQueryData.Cancel) {
    await conversation.skip();
  }
  if (amountMessage !== undefined) {
    const trimmedAmount = trimAmount(amountMessage, baseCoinDecimals);

    const { isValid: amountIsValid, reason } = isValidTokenAmount({
      amount: trimmedAmount,
      maxAvailableAmount: maxBaseCoinAmount,
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
      `Please, enter the <b>${baseCoinSymbol} amount</b> you want to deposit.`,
      { reply_markup: closeConversation, parse_mode: 'HTML' },
    );

    await conversation.skip({ drop: true });
  }

  if (amountMessage === undefined) {
    await ctx.reply(
      'Cannot process amount you want to add. Please, try again or contact support.',
      { reply_markup: retryButton },
    );

    return;
  }

  const trimmedAmount = trimAmount(amountMessage, baseCoinDecimals);

  await ctx.replyFmt(fmt`Do you want to ${bold('increase orders count')}?`, {
    reply_markup: yesOrNo,
  });

  const increaseOrdersContext = await conversation.waitFor(
    'callback_query:data',
  );
  const increaseOrdersCallbackQueryData =
    increaseOrdersContext.callbackQuery.data;
  let addOrdersCount = 0;

  if (increaseOrdersCallbackQueryData === 'no') {
    await increaseOrdersContext.answerCallbackQuery();
  } else if (increaseOrdersCallbackQueryData === 'yes') {
    await increaseOrdersContext.answerCallbackQuery();

    await ctx.replyFmt(
      fmt([
        fmt`🔧 ${bold('Heads up!')} 🔧\n\nEach new trade order incurs a ${code(ONE_TRADE_GAS_FEE_IN_MIST.toPrecision())} ${bold('MIST')} `,
        fmt`gas fee (${code(ONE_TRADE_GAS_FEE_IN_SUI)} ${bold('SUI')}), slightly higher for smooth transactions. `,
        fmt`Any leftover ${bold('SUI')} after trades will be refunded to you.`,
      ]),
    );

    const newBaseBalance = baseBalance.plus(trimmedAmount);
    const maxTotalOrdersCount = Math.min(
      Math.floor(newBaseBalance.toNumber()),
      MAX_TOTAL_ORDERS_COUNT,
    );
    const availableToAddOrdersCount = new BigNumber(maxTotalOrdersCount)
      .minus(currentTotalOrdersCount)
      .toString();

    await ctx.reply(
      `How much orders do you want to add?\n\n<b>Min</b>: <code>0</code>\n<b>Max</b>: ` +
        `<code>${availableToAddOrdersCount}</code>`,
      { reply_markup: closeConversation, parse_mode: 'HTML' },
    );

    let userConfirmedTotalOrdersCount = false;

    do {
      const totalOrdersContext = await conversation.wait();
      const totalOrdersCallbackQueryData =
        totalOrdersContext.callbackQuery?.data;
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
          totalOrdersInt >= 0 && totalOrdersInt <= +availableToAddOrdersCount;

        if (!totalOrdersIsValid) {
          await ctx.reply(
            `Minimum <b>total orders count</b> to add is <code>0</code>, maximum &#8213; ` +
              `<code>${availableToAddOrdersCount}</code>.\n\nPlease, try again.`,
            { reply_markup: closeConversation, parse_mode: 'HTML' },
          );

          await conversation.skip({ drop: true });
        }

        addOrdersCount = totalOrdersInt;
      } else {
        await ctx.replyFmt(
          fmt`Please, enter the ${bold('total orders count')} you want to add.`,
          { reply_markup: closeConversation },
        );

        await conversation.skip({ drop: true });
      }

      if (addOrdersCount === undefined) {
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
        .multipliedBy(addOrdersCount)
        .toString();

      const userHasNotEnoughSui = new BigNumber(availableSuiBalance).isLessThan(
        gasAmountForTrades,
      );

      if (userHasNotEnoughSui) {
        await ctx.replyFmt(
          fmt([
            fmt`To add ${code(addOrdersCount)} ${bold('total orders')}, you need at least ${code(gasAmountForTrades)} ${bold('SUI')}.\n`,
            fmt`Now your available balance is ${code(availableSuiBalance)} ${bold('SUI')}.\n\nPlease, enter another count of ${bold('total orders')} to add `,
            fmt`or top up your ${bold('SUI')} balance.`,
          ]),
          { reply_markup: closeConversation },
        );

        await conversation.skip({ drop: true });
      }

      await ctx.replyFmt(
        fmt([
          fmt`For ${code(addOrdersCount)} ${bold('total orders')} ${code(gasAmountForTrades)} ${bold('SUI')} `,
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
  } else {
    await ctx.reply('Please, choose the button.', {
      reply_markup: closeConversation,
    });

    await conversation.skip({ drop: true });
  }

  const addOrdersCountString =
    addOrdersCount !== 0 ? ` and *add ${addOrdersCount} orders*` : '';

  await ctx.reply(
    `You are about to *deposit ${trimmedAmount} ${baseCoinSymbol}*${addOrdersCountString}.`,
    { reply_markup: confirmWithCloseKeyboard, parse_mode: 'Markdown' },
  );

  const confirmContext = await conversation.waitFor('callback_query:data');
  const confirmCallbackQueryData = confirmContext.callbackQuery.data;

  if (confirmCallbackQueryData === CallbackQueryData.Cancel) {
    await conversation.skip();
  }
  if (confirmCallbackQueryData === CallbackQueryData.Confirm) {
    await confirmContext.answerCallbackQuery();
  } else {
    await ctx.reply(`Please, confirm or cancel depositing.`, {
      reply_markup: closeConversation,
    });

    await conversation.skip({ drop: true });
  }

  await ctx.reply('Preparing deposit data...');

  const allCoinObjectsList = await conversation.external(async () => {
    const walletManager = await getWalletManager();
    const allCoinObjects = await walletManager.getAllCoinObjects({
      publicKey: ctx.session.publicKey,
      coinType: baseCoinType,
    });

    return allCoinObjects;
  });

  const baseCoinAmountToDepositIntoDCA = new BigNumber(trimmedAmount)
    .multipliedBy(10 ** baseCoinDecimals)
    .toString();

  await ctx.reply('Creating deposit transaction...');

  const baseDepositTransaction = await getTransactionFromMethod({
    conversation,
    ctx,
    method: DCAManagerSingleton.createDCADepositBaseTransaction,
    params: {
      allCoinObjectsList,
      baseCoinAmountToDepositIntoDCA,
      baseCoinType,
      quoteCoinType,
      dca: dcaId,
      addOrdersCount,
    },
  });

  if (baseDepositTransaction === undefined) {
    await ctx.reply(
      'Cannot create transaction to deposit base coin.\n\nPlease, try again or contact support.',
      { reply_markup: retryButton },
    );

    return;
  }

  await ctx.reply('Depositing...');

  const depositResult = await signAndExecuteTransaction({
    conversation,
    ctx,
    transaction: baseDepositTransaction,
  });

  if (
    depositResult.result === TransactionResultStatus.Success &&
    depositResult.digest !== undefined
  ) {
    const retryButtons = retryButton.inline_keyboard[0];
    const showWithRetryKeyboard = showActiveDCAsKeyboard
      .clone()
      .row()
      .add(...retryButtons);

    await ctx.reply(
      `<b>${baseCoinSymbol}</b> is <a href="${getSuiScanTransactionLink(depositResult.digest)}">` +
        `successfully deposited</a>!`,
      { reply_markup: showWithRetryKeyboard, parse_mode: 'HTML' },
    );

    return;
  }

  if (
    depositResult.result === TransactionResultStatus.Failure &&
    depositResult.digest !== undefined
  ) {
    await ctx.reply(
      `<a href="${getSuiScanTransactionLink(depositResult.digest)}">Failed</a> to ` +
        `deposit <b>${baseCoinSymbol}</b>.`,
      { reply_markup: retryButton, parse_mode: 'HTML' },
    );

    return;
  }

  await ctx.reply(`Failed to deposit <b>${baseCoinSymbol}</b>.`, {
    reply_markup: retryButton,
    parse_mode: 'HTML',
  });

  return;
}
