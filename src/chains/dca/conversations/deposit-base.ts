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
import { TransactionResultStatus, getWalletManager } from '../../sui.functions';
import {
  findCoinInAssets,
  getSuiScanTransactionLink,
  trimAmount,
} from '../../utils';
import { MAX_TOTAL_ORDERS_COUNT } from '../constants';

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

  await ctx.reply('Do you want to increase orders count?', {
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
  }
  if (increaseOrdersCallbackQueryData === 'yes') {
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
      { parse_mode: 'HTML' },
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
    await ctx.reply('Please, choose the button.', {
      reply_markup: closeConversation,
    });

    await conversation.skip({ drop: true });
  }

  const closeButtons = closeConversation.inline_keyboard[0];
  const confirmWithCloseKeyboard = confirm.clone().add(...closeButtons);

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
