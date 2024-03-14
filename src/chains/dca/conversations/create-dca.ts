import {
  CommonCoinData,
  DCAManagerSingleton,
  DCATimescale,
  NoRoutesError,
  SUI_DECIMALS,
  convertToBNFormat,
  isCommonCoinData,
  isValidTokenAddress,
  isValidTokenAmount,
} from '@avernikoz/rinbot-sui-sdk';
import { bold, code, fmt, link } from '@grammyjs/parse-mode';
import BigNumber from 'bignumber.js';
import closeConversation from '../../../inline-keyboards/closeConversation';
import confirmWithCloseKeyboard from '../../../inline-keyboards/confirm-with-close';
import dcaTimeUnitKeyboard from '../../../inline-keyboards/dcaTimeUnit';
import { retryAndGoHomeButtonsData } from '../../../inline-keyboards/retryConversationButtonsFactory';
import showActiveDCAsKeyboard from '../../../inline-keyboards/showActiveDCAs';
import skip from '../../../inline-keyboards/skip';
import { BotContext, MyConversation } from '../../../types';
import { CallbackQueryData } from '../../../types/callback-queries-data';
import { ConversationId } from '../../conversations.config';
import {
  getTransactionFromMethod,
  signAndExecuteTransaction,
} from '../../conversations.utils';
import { RINCEL_COIN_TYPE, USDC_COIN_TYPE } from '../../sui.config';
import {
  getCoinManager,
  getRouteManager,
  getWalletManager,
} from '../../sui.functions';
import {
  extractCoinTypeFromLink,
  findCoinInAssets,
  formatPrice,
  getSuiScanCoinLink,
  getSuiScanTransactionLink,
  isValidCoinLink,
  trimAmount,
} from '../../utils';
import {
  DEFAULT_MAX_PRICE,
  MAX_TOTAL_ORDERS_COUNT,
  MIN_DCA_BASE_AMOUNT,
  MIN_TOTAL_ORDERS_COUNT,
  ONE_TRADE_GAS_FEE_IN_MIST,
  ONE_TRADE_GAS_FEE_IN_SUI,
} from '../constants';

export async function createDca(
  conversation: MyConversation,
  ctx: BotContext,
): Promise<void> {
  const retryButton = retryAndGoHomeButtonsData[ConversationId.CreateDca];
  const baseCoinType = USDC_COIN_TYPE;
  const baseCoinSymbol = 'USDC';
  const baseCoinDecimals = 6;

  await ctx.reply(
    `Base coin is <b>${baseCoinSymbol}</b> by default.\n\n<span class="tg-spoiler"><b>Hint</b>: <b>DCA</b> will ` +
      'buy another coin, which you will specify, for the base coin.</span>',
    {
      reply_markup: closeConversation,
      parse_mode: 'HTML',
    },
  );

  const lookingAtAssetsMessage = await ctx.reply(
    `Looking at your assets to find <b>${baseCoinSymbol}</b>...`,
    { parse_mode: 'HTML' },
  );

  const allCoinsAssets = await conversation.external(async () => {
    const walletManager = await getWalletManager();
    const coinAssets = await walletManager.getAllCoinAssets(
      ctx.session.publicKey,
    );

    return coinAssets;
  });

  const foundUsdc = findCoinInAssets(allCoinsAssets, baseCoinType);

  if (foundUsdc === undefined) {
    await ctx.api.editMessageText(
      lookingAtAssetsMessage.chat.id,
      lookingAtAssetsMessage.message_id,
      `<b>${baseCoinSymbol}</b> is not found in your assets. Please, top up your <b>${baseCoinSymbol}</b> balance to create <b>DCA</b>.`,
      { reply_markup: retryButton, parse_mode: 'HTML' },
    );

    return;
  }

  if (
    new BigNumber(foundUsdc.balance).isLessThan(
      new BigNumber(MIN_DCA_BASE_AMOUNT),
    )
  ) {
    await ctx.api.editMessageText(
      lookingAtAssetsMessage.chat.id,
      lookingAtAssetsMessage.message_id,
      `Yoo need at least <code>${MIN_DCA_BASE_AMOUNT}</code> <b>${baseCoinSymbol}</b> to create <b>DCA</b>. Please, top up your balance.`,
      { reply_markup: retryButton, parse_mode: 'HTML' },
    );

    return;
  }

  await ctx.api.editMessageText(
    lookingAtAssetsMessage.chat.id,
    lookingAtAssetsMessage.message_id,
    `<b>${baseCoinSymbol}</b> is found in your assets!\n\nPlease, enter a <b>quote coin</b> you want <b>DCA</b> to buy: ` +
      'coin type or a link to suiscan.',
    { reply_markup: closeConversation, parse_mode: 'HTML' },
  );

  await ctx.reply(
    'Example of coin type format:\n<code>0xb6baa75577e4bbffba70207651824606e51d38ae23aa94fb9fb700e0ecf50064::kimchi::KIMCHI</code>\n\nExample of suiscan link:\nhttps://suiscan.xyz/mainnet/coin/0xb6baa75577e4bbffba70207651824606e51d38ae23aa94fb9fb700e0ecf50064::kimchi::KIMCHI',
    { parse_mode: 'HTML' },
  );

  let quoteCoin: CommonCoinData | null = null;
  let quoteCoinPrice: string | null = null;

  await conversation.waitUntil(async (ctx) => {
    if (ctx.callbackQuery?.data === CallbackQueryData.Cancel) {
      return false;
    }

    const possibleCoin = (ctx.msg?.text || '').trim();
    const coinTypeIsValid = isValidTokenAddress(possibleCoin);
    const suiScanLinkIsValid = isValidCoinLink(possibleCoin);

    if (!coinTypeIsValid && !suiScanLinkIsValid) {
      const replyText =
        'Coin address or suiscan link is not correct. Make sure inputed data is correct.\n\nYou can enter a coin type or a Suiscan link.';

      await ctx.reply(replyText, { reply_markup: closeConversation });

      return false;
    }

    const coinType: string | null = coinTypeIsValid
      ? possibleCoin
      : extractCoinTypeFromLink(possibleCoin);

    // ts check
    if (coinType === null) {
      await ctx.reply(
        'Suiscan link is not valid. Make sure it is correct.\n\nYou can enter a coin type or a Suiscan link.',
        { reply_markup: closeConversation },
      );
      return false;
    }

    if (coinType === baseCoinType) {
      await ctx.reply(
        'Base coin cannot be the quote coin.\n\nPlease, enter another coin type or suiscan link.',
        { reply_markup: closeConversation },
      );

      return false;
    }

    const coinManager = await getCoinManager();
    const fetchedCoin = await coinManager.getCoinByType2(coinType);

    if (fetchedCoin === null) {
      await ctx.reply(
        `Coin type not found. Make sure type "${coinType}" is correct.\n\nYou can enter a coin type or a Suiscan link.`,
        { reply_markup: closeConversation },
      );

      return false;
    }

    const routerManager = await getRouteManager();

    const findingRouteMessage = await ctx.reply(
      `Finding route for <b>DCA</b> to buy <code>${coinType}</code>...`,
      { parse_mode: 'HTML' },
    );
    try {
      const { maxOutputAmount } = await conversation.external(() =>
        routerManager.getBestRouteData({
          tokenFrom: baseCoinType,
          tokenTo: coinType,
          signerAddress: ctx.session.publicKey,
          amount: MIN_DCA_BASE_AMOUNT,
          slippagePercentage: 0,
        }),
      );
      const quoteCoinDecimals = fetchedCoin.decimals;
      const parsedOutputAmount = new BigNumber(
        maxOutputAmount.toString(),
      ).dividedBy(10 ** quoteCoinDecimals);
      const unformattedCoinPrice = new BigNumber(MIN_DCA_BASE_AMOUNT)
        .dividedBy(parsedOutputAmount)
        .toString();
      quoteCoinPrice = formatPrice(unformattedCoinPrice);
    } catch (error) {
      if (error instanceof NoRoutesError) {
        console.error(
          '[askForQuoteDcaCoin.getBestRouteTransaction] NoRoutesError occured:',
          error.message,
        );

        await ctx.api.editMessageText(
          findingRouteMessage.chat.id,
          findingRouteMessage.message_id,
          `Cannot find route to buy <code>${coinType}</code>.\n\nPlease, specify another coin for <b>DCA</b>.`,
          { reply_markup: closeConversation, parse_mode: 'HTML' },
        );

        return false;
      } else {
        console.error(
          '[askForQuoteDcaCoin.getBestRouteTransaction] error occured:',
          error,
        );

        await ctx.api.editMessageText(
          findingRouteMessage.chat.id,
          findingRouteMessage.message_id,
          `Something went wrong while finding route to buy <code>${coinType}</code>.\n\n` +
            `Please, specify another coin or contact support.`,
          { reply_markup: closeConversation, parse_mode: 'HTML' },
        );

        return false;
      }
    }

    await ctx.api.editMessageText(
      findingRouteMessage.chat.id,
      findingRouteMessage.message_id,
      `Route for <b>DCA</b> to buy <code>${coinType}</code> is <b>found</b>!`,
      { reply_markup: closeConversation, parse_mode: 'HTML' },
    );

    quoteCoin = fetchedCoin;

    return true;
  });

  // Note: The following check and type assertion exist due to limitations or issues in TypeScript type checking for this specific case.
  // The if statement is not expected to execute, and the type assertion is used to satisfy TypeScript's type system.
  if (!isCommonCoinData(quoteCoin) || quoteCoinPrice === null) {
    await ctx.reply(
      'Specified coin or its price cannot be found.\n\nPlease, try again and specify another one.',
      { reply_markup: retryButton },
    );

    return;
  }

  const validatedQuoteCoin = quoteCoin as CommonCoinData;
  const quoteCoinSymbol = validatedQuoteCoin.symbol || validatedQuoteCoin.type;
  const maxBaseCoinAmount = foundUsdc.balance;

  await ctx.reply(
    `Enter the <b>base coin amount</b> you want to allocate (<code>${MIN_DCA_BASE_AMOUNT}</code> - <code>${maxBaseCoinAmount}` +
      `</code> <b>${baseCoinSymbol}</b>).\n\nExample: <code>100</code>`,
    {
      reply_markup: closeConversation,
      parse_mode: 'HTML',
    },
  );

  const baseCoinAmountContext = await conversation.waitUntil(async (ctx) => {
    if (ctx.callbackQuery?.data === CallbackQueryData.Cancel) {
      return false;
    }

    const inputAmount = trimAmount(ctx.msg?.text ?? '', baseCoinDecimals);

    const { isValid: amountIsValid, reason } = isValidTokenAmount({
      amount: inputAmount,
      maxAvailableAmount: maxBaseCoinAmount,
      minAvailableAmount: MIN_DCA_BASE_AMOUNT,
      decimals: baseCoinDecimals,
    });

    if (!amountIsValid) {
      await ctx.reply(
        `Invalid amount. Reason: ${reason}\n\nPlease, try again.`,
        { reply_markup: closeConversation },
      );

      return false;
    }

    return true;
  });
  const baseCoinAmount: string = trimAmount(
    baseCoinAmountContext.msg?.text ?? '',
    baseCoinDecimals,
  );

  // ts check
  if (isNaN(+baseCoinAmount)) {
    await ctx.reply(`Invalid base coin amount.\n\nCannot continue.`, {
      reply_markup: retryButton,
    });
    return;
  }
  console.debug('baseCoinAmount:', baseCoinAmount);

  // Asking for a min price
  const skipButton = skip.inline_keyboard[0];
  const closeWithSkipReplyMarkup = closeConversation.clone().add(...skipButton);

  await ctx.reply(
    `Enter the <b>minimum price</b> at which <b>DCA</b> will buy <b>${quoteCoinSymbol}</b>.\n\n` +
      `Current <b>${quoteCoinSymbol}</b> price: ` +
      `<code>${quoteCoinPrice}</code>\n<b>Max valid price</b>: <code>${DEFAULT_MAX_PRICE}</code>\n\n` +
      `<b>Note</b>: this parameter cannot be changed in the future.`,
    { reply_markup: closeWithSkipReplyMarkup, parse_mode: 'HTML' },
  );

  const minPriceContext = await conversation.waitUntil(async (ctx) => {
    if (ctx.callbackQuery?.data === CallbackQueryData.Cancel) {
      return false;
    }
    if (ctx.callbackQuery?.data === 'skip') {
      await ctx.answerCallbackQuery();
      return true;
    }

    const inputAmount = ctx.msg?.text ?? '';

    const decimals = validatedQuoteCoin.decimals;

    const { isValid: amountIsValid, reason } = isValidTokenAmount({
      amount: inputAmount,
      maxAvailableAmount: DEFAULT_MAX_PRICE,
      decimals,
    });

    if (!amountIsValid) {
      await ctx.reply(
        `Invalid price. Reason: ${reason}\n\nPlease, try again.`,
        { reply_markup: closeConversation },
      );

      return false;
    }

    return true;
  });

  const minPrice =
    minPriceContext.callbackQuery?.data === 'skip'
      ? undefined
      : minPriceContext.msg?.text;

  console.debug('minPrice:', minPrice);

  // Asking for a max price
  await ctx.reply(
    `Enter the <b>maximum price</b> at which <b>DCA</b> will buy <b>${quoteCoinSymbol}</b>.\n\n` +
      `Current <b>${quoteCoinSymbol}</b> price: ` +
      `<code>${quoteCoinPrice}</code>\n<b>Max valid price</b>: <code>${DEFAULT_MAX_PRICE}</code>` +
      (minPrice === undefined
        ? '\n\n'
        : `\n<b>Min valid price</b>: <code>${minPrice}</code>\n\n`) +
      `<b>Note</b>: this parameter cannot be changed in the future.`,
    { reply_markup: closeWithSkipReplyMarkup, parse_mode: 'HTML' },
  );

  let maxPrice: string | undefined;
  const maxPriceContext = await conversation.wait();
  const arrivedPriceMessage: string | undefined = maxPriceContext.msg?.text;
  const arrivedPriceCallbackQueryData: string | undefined =
    maxPriceContext.callbackQuery?.data;

  if (arrivedPriceCallbackQueryData === CallbackQueryData.Cancel) {
    await conversation.skip();
  } else if (arrivedPriceCallbackQueryData === 'skip') {
    await maxPriceContext.answerCallbackQuery();
  } else if (arrivedPriceMessage !== undefined) {
    maxPrice = arrivedPriceMessage;
    const decimals = validatedQuoteCoin.decimals;

    const { isValid: amountIsValid, reason } = isValidTokenAmount({
      amount: maxPrice,
      maxAvailableAmount: DEFAULT_MAX_PRICE,
      minAvailableAmount: minPrice,
      decimals,
    });

    if (!amountIsValid) {
      await ctx.reply(
        `Invalid price. Reason: ${reason}\n\nPlease, try again.`,
        {
          reply_markup: closeConversation,
        },
      );

      await conversation.skip({ drop: true });
    }
  }
  console.debug('maxPrice:', maxPrice);

  const closeButtons = closeConversation.inline_keyboard[0];
  const dcaTimeUnitWithCloseKeyboard = dcaTimeUnitKeyboard
    .clone()
    .row()
    .add(...closeButtons);

  // Asking for a time unit
  await ctx.reply(
    'Choose the <b>time unit</b> for trades period.\n\n<span class="tg-spoiler"><b>Hint</b>: for ' +
      '<i>seconds</i> time unit only <b>30</b> seconds are available.</span>',
    {
      reply_markup: dcaTimeUnitWithCloseKeyboard,
      parse_mode: 'HTML',
    },
  );

  let timeUnit: DCATimescale | undefined;
  const timeUnitContext = await conversation.waitFor('callback_query:data');
  const arrivedUnitCallbackQueryData: string | undefined =
    timeUnitContext.callbackQuery.data;

  if (arrivedUnitCallbackQueryData === CallbackQueryData.Cancel) {
    await conversation.skip();
  }
  switch (arrivedUnitCallbackQueryData) {
    case 'seconds':
      timeUnit = DCATimescale.Seconds;
      break;
    case 'minutes':
      timeUnit = DCATimescale.Minutes;
      break;
    case 'hours':
      timeUnit = DCATimescale.Hours;
      break;
    case 'days':
      timeUnit = DCATimescale.Days;
      break;
    case 'weeks':
      timeUnit = DCATimescale.Weeks;
      break;
    case 'months':
      timeUnit = DCATimescale.Months;
      break;
  }

  await timeUnitContext.answerCallbackQuery();

  if (timeUnit === undefined) {
    await ctx.reply('Please, choose the time unit from buttons.', {
      reply_markup: closeConversation,
    });

    await conversation.skip();
  }

  if (timeUnit === undefined) {
    await ctx.reply(
      'Something went wrong while getting time unit. Please, try again or contact support.',
      { reply_markup: retryButton },
    );

    return;
  }
  console.debug('timeUnit:', timeUnit);

  const timeUnitName: string = arrivedUnitCallbackQueryData;

  // Asking for a time amount
  let timeAmount: number | undefined;

  if (timeUnit === DCATimescale.Seconds) {
    await ctx.reply(
      `For <i>seconds</i> time unit only <b>30</b> seconds are available, so <b>DCA</b> will buy ` +
        `<b>${quoteCoinSymbol}</b> every 30 seconds.`,
      { reply_markup: closeConversation, parse_mode: 'HTML' },
    );

    timeAmount = 30;
  } else {
    await ctx.reply(
      `Enter the <b>period</b>: <b>DCA</b> will buy <b>` +
        `${quoteCoinSymbol}</b> every <u>    </u> ${timeUnitName}.\n\n` +
        `<b>Example</b>: <code>5</code>`,
      {
        reply_markup: closeConversation,
        parse_mode: 'HTML',
      },
    );

    const timeAmountContext = await conversation.waitFor('message:text');
    const inputedTimeAmount = timeAmountContext.msg.text;
    const inputedTimeAmountInt = parseInt(inputedTimeAmount);

    if (isNaN(inputedTimeAmountInt)) {
      await ctx.reply('Period must be an integer. Please, try again.', {
        reply_markup: closeConversation,
      });

      await conversation.skip({ drop: true });
    }

    const timeAmountIsValid =
      inputedTimeAmountInt > 0 && inputedTimeAmountInt < 10_000;
    if (!timeAmountIsValid) {
      await ctx.reply(
        'Period must be greater than <code>0</code> and less than <code>10000</code>.\n\n' +
          'Please, enter suitable value.',
        { reply_markup: closeConversation, parse_mode: 'HTML' },
      );

      await conversation.skip({ drop: true });
    }

    timeAmount = inputedTimeAmountInt;
  }

  // Asking for total orders count
  await ctx.replyFmt(
    fmt([
      fmt`📊 ${bold('Understanding Total Orders Count in DCA')} 📊\n\n`,
      fmt`${bold('Total Orders Count')} in DCA reflects the total number of orders you've executed within your `,
      fmt`Dollar-Cost Averaging strategy, considering the division of your allocated funds.\n\n`,
      fmt`For instance, let's say you allocate ${bold('$700')} to purchase `,
      fmt`${link('RINCEL', getSuiScanCoinLink(RINCEL_COIN_TYPE))} over the course of a week, with the intention to buy `,
      fmt`${bold('every day')}. In this scenario, your ${bold('Total Orders Count')} would be ${bold('7')}, as you're executing `,
      fmt`an order each day for seven days.\n\nAdditionally, with ${bold('$700')} allocated over ${bold('7 days')}, `,
      fmt`your daily order amount would be ${bold('$100')}. This breakdown helps track how your allocated funds are `,
      fmt`utilized over time, reflecting your investment frequency and amount per order.`,
    ]),
  );

  await ctx.replyFmt(
    fmt([
      fmt`🔧 ${bold('Heads up!')} 🔧\n\nEach trade order incurs a ${code(ONE_TRADE_GAS_FEE_IN_MIST.toPrecision())} ${bold('MIST')} `,
      fmt`gas fee (${code(ONE_TRADE_GAS_FEE_IN_SUI)} ${bold('SUI')}), slightly higher for smooth transactions. `,
      fmt`Any leftover ${bold('SUI')} after trades will be refunded to you.`,
    ]),
  );

  const maxTotalOrdersCount = Math.min(
    Math.floor(+baseCoinAmount),
    MAX_TOTAL_ORDERS_COUNT,
  );

  await ctx.replyFmt(
    fmt([
      fmt`Enter the ${bold('total orders count')} for your ${bold('DCA')}.\n\n`,
      fmt`${bold('Min')}: ${code(MIN_TOTAL_ORDERS_COUNT)}\n${bold('Max')} for specified ${bold(baseCoinSymbol)} amount: `,
      fmt`${code(maxTotalOrdersCount)}`,
    ]),
    { reply_markup: closeConversation },
  );

  let totalOrders;
  let userConfirmedTotalOrdersCount = false;
  do {
    const totalOrdersContext = await conversation.wait();
    const totalOrdersMessage = totalOrdersContext.msg?.text;
    const totalOrdersCallbackQueryData = totalOrdersContext.callbackQuery?.data;

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

      const totalOrdersCountIsValid =
        totalOrdersInt >= MIN_TOTAL_ORDERS_COUNT &&
        totalOrdersInt <= maxTotalOrdersCount;

      if (!totalOrdersCountIsValid) {
        await ctx.replyFmt(
          fmt([
            fmt`Minimum ${bold('total orders count')} is ${code(MIN_TOTAL_ORDERS_COUNT)}. `,
            fmt`Maximum — ${code(maxTotalOrdersCount)}.\n\nPlease, try again.`,
          ]),
          { reply_markup: closeConversation },
        );

        await conversation.skip({ drop: true });
      }

      totalOrders = totalOrdersInt;
    } else {
      await ctx.reply('Please, enter <b>total orders count</b>.', {
        reply_markup: closeConversation,
        parse_mode: 'HTML',
      });

      await conversation.skip({ drop: true });
    }

    if (totalOrders === undefined) {
      await ctx.reply(
        'Cannot process <b>total orders count</b>. Please, try again or contact support.',
        { reply_markup: retryButton, parse_mode: 'HTML' },
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
          fmt`To set ${code(totalOrders)} ${bold('total orders')}, you need at least ${code(gasAmountForTrades)} ${bold('SUI')}.\n`,
          fmt`Now your available balance is ${code(availableSuiBalance)} ${bold('SUI')}.\n\nPlease, enter another count of ${bold('total orders')} `,
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
        fmt`Please, confirm specified ${bold('total orders count')}.`,
        { reply_markup: closeConversation },
      );

      await confirmTotalOrdersContext.answerCallbackQuery();
    }
  } while (!userConfirmedTotalOrdersCount);

  const oneOrderBaseCoinAmount = trimAmount(
    new BigNumber(baseCoinAmount).dividedBy(totalOrders).toString(),
    baseCoinDecimals,
  );
  console.debug('totalOrders:', totalOrders);

  // Logging all the entered DCA params and asking for confirmation
  let priceRangeString: string;
  if (minPrice === undefined && maxPrice === undefined) {
    priceRangeString = '.';
  } else if (minPrice !== undefined && maxPrice === undefined) {
    priceRangeString = ` when <b>${quoteCoinSymbol}</b> price is greater than or equal to <b>${minPrice}</b> <b>${baseCoinSymbol}</b>.`;
  } else if (minPrice === undefined && maxPrice !== undefined) {
    priceRangeString = ` when <b>${quoteCoinSymbol}</b> price is less than or equal to <b>${maxPrice}</b> <b>${baseCoinSymbol}</b>.`;
  } else {
    priceRangeString = ` when <b>${quoteCoinSymbol}</b> price is between <b>${minPrice}</b> and <b>${maxPrice}</b> <b>${baseCoinSymbol}</b>.`;
  }

  await ctx.reply(
    'Please, <b>confirm</b> you want to create the next <b>DCA</b>:\n\n' +
      `Buy <a href="${getSuiScanCoinLink(validatedQuoteCoin.type)}"><b>${quoteCoinSymbol}</b></a> ` +
      `for ${oneOrderBaseCoinAmount} <a href="${getSuiScanCoinLink(baseCoinType)}"><b>${baseCoinSymbol}</b></a> ` +
      `<i><b>${totalOrders} times</b></i> every <i><b>${timeAmount} ${timeUnitName}</b></i>` +
      priceRangeString,
    { reply_markup: confirmWithCloseKeyboard, parse_mode: 'HTML' },
  );

  const confirmDcaContext = await conversation.waitFor('callback_query:data');
  const confirmDcaCallbackQueryData = confirmDcaContext.callbackQuery.data;

  if (confirmDcaCallbackQueryData === CallbackQueryData.Cancel) {
    await conversation.skip();
  }
  if (confirmDcaCallbackQueryData === 'confirm') {
    await confirmDcaContext.answerCallbackQuery();
  } else {
    await ctx.reply('Please, confirm or cancel DCA creation.', {
      reply_markup: closeConversation,
    });

    await conversation.skip({ drop: true });
  }

  await ctx.reply('Constructing transaction to create <b>DCA</b>...', {
    parse_mode: 'HTML',
  });

  const allCoinObjectsList = await conversation.external(async () => {
    const walletManager = await getWalletManager();
    const allCoinObjects = await walletManager.getAllCoinObjects({
      publicKey: ctx.session.publicKey,
      coinType: baseCoinType,
    });

    return allCoinObjects;
  });

  const createDCATransaction = await getTransactionFromMethod({
    conversation,
    ctx,
    method: DCAManagerSingleton.createDCAInitTransaction,
    params: {
      allCoinObjectsList,
      baseCoinAmountToDepositIntoDCA: convertToBNFormat(
        baseCoinAmount,
        baseCoinDecimals,
      ),
      baseCoinType: baseCoinType,
      every: timeAmount,
      maxPrice:
        maxPrice !== undefined
          ? convertToBNFormat(maxPrice, baseCoinDecimals)
          : undefined,
      minPrice:
        minPrice !== undefined
          ? convertToBNFormat(minPrice, baseCoinDecimals)
          : undefined,
      quoteCoinType: validatedQuoteCoin.type,
      timeScale: timeUnit,
      totalOrders,
      publicKey: ctx.session.publicKey,
    },
  });

  if (createDCATransaction === undefined) {
    await ctx.reply(
      'Failed to construct transaction for <b>DCA</b> creation. Please, try again or contact support.',
      { reply_markup: retryButton, parse_mode: 'HTML' },
    );

    return;
  }

  await ctx.reply('Creating <b>DCA</b>...', { parse_mode: 'HTML' });

  const resultOfExecution = await signAndExecuteTransaction({
    conversation,
    ctx,
    transaction: createDCATransaction,
  });

  if (resultOfExecution.result === 'success' && resultOfExecution.digest) {
    const retryButtons = retryButton.inline_keyboard[0];
    const showActiveDCAsWithRetryKeyboard = showActiveDCAsKeyboard
      .clone()
      .row()
      .add(...retryButtons);

    await ctx.replyFmt(
      fmt`${bold('DCA')} is ${link('successfully created', getSuiScanTransactionLink(resultOfExecution.digest))}!`,
      { reply_markup: showActiveDCAsWithRetryKeyboard },
    );

    return;
  }

  if (resultOfExecution.result === 'failure' && resultOfExecution.digest) {
    await ctx.replyFmt(
      fmt`${link('Failed', getSuiScanTransactionLink(resultOfExecution.digest))} to create ${bold('DCA')}.`,
      { reply_markup: retryButton },
    );

    return;
  }

  await ctx.reply(
    'Failed to created <b>DCA</b>. Please, try again or contact support.',
    {
      reply_markup: retryButton,
      parse_mode: 'HTML',
    },
  );

  return;
}
