import {
  CommonCoinData,
  DCAManagerSingleton,
  DCATimescale,
  convertToBNFormat,
  isCommonCoinData,
  isValidTokenAddress,
  isValidTokenAmount,
} from '@avernikoz/rinbot-sui-sdk';
import BigNumber from 'bignumber.js';
import closeConversation from '../../../inline-keyboards/closeConversation';
import confirm from '../../../inline-keyboards/confirm';
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
import { USDC_COIN_TYPE } from '../../sui.config';
import {
  getCoinManager,
  getRouteManager,
  getWalletManager,
} from '../../sui.functions';
import {
  extractCoinTypeFromLink,
  findCoinInAssets,
  formatPrice,
  getSuiVisionCoinLink,
  isValidCoinLink,
} from '../../utils';
import {
  MAX_TOTAL_ORDERS_COUNT,
  MIN_DCA_BASE_AMOUNT,
  MIN_TOTAL_ORDERS_COUNT,
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
      if (
        // TODO: Use NoRoutesError
        error instanceof Error &&
        error.message.includes(
          `[RouteManager] There is no paths for coins "${baseCoinType}" and "${coinType}" (all outputAmounts = 0)`,
        )
      ) {
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

    const inputAmount = ctx.msg?.text ?? '';

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
  const baseCoinAmount: string | undefined = baseCoinAmountContext.msg?.text;

  // ts check
  if (baseCoinAmount === undefined) {
    await ctx.reply(`Invalid base coin amount.\n\nCannot continue.`, {
      reply_markup: retryButton,
    });
    return;
  }
  console.debug('baseCoinAmount:', baseCoinAmount);

  // Asking for a min price
  const skipButton = skip.inline_keyboard[0];
  const closeWithSkipReplyMarkup = closeConversation.clone().add(...skipButton);
  const defaultMinPrice = '0';
  const defaultMaxPrice = (1_000_000_000).toString();

  await ctx.reply(
    `Enter the <b>minimum price</b> at which <b>DCA</b> will buy <b>${quoteCoinSymbol}</b>.\n\n` +
      `Current <b>${quoteCoinSymbol}</b> price: ` +
      `<code>${quoteCoinPrice}</code>\n<b>Max valid price</b>: <code>${defaultMaxPrice}</code>`,
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
      maxAvailableAmount: defaultMaxPrice,
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
      ? defaultMinPrice
      : minPriceContext.msg?.text;

  if (minPrice === undefined) {
    await ctx.reply(
      'Something went wrong while getting min price. Please, try again or contact support.',
      { reply_markup: retryButton },
    );

    return;
  }
  console.debug('minPrice:', minPrice);

  // Asking for a max price
  await ctx.reply(
    `Enter the <b>maximum price</b> at which <b>DCA</b> will buy <b>${quoteCoinSymbol}</b>.\n\n` +
      `Current <b>${quoteCoinSymbol}</b> price: ` +
      `<code>${quoteCoinPrice}</code>\n<b>Max valid price</b>: <code>${defaultMaxPrice}</code>` +
      (minPrice === defaultMinPrice
        ? ''
        : `\n<b>Min valid price</b>: <code>${minPrice}</code>`),
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
    maxPrice = defaultMaxPrice;
    await maxPriceContext.answerCallbackQuery();
  } else if (arrivedPriceMessage !== undefined) {
    maxPrice = arrivedPriceMessage;
    const decimals = validatedQuoteCoin.decimals;

    const { isValid: amountIsValid, reason } = isValidTokenAmount({
      amount: maxPrice,
      maxAvailableAmount: defaultMaxPrice,
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

  if (maxPrice === undefined) {
    await ctx.reply(
      'Something went wrong while getting max price. Please, try again or contact support.',
      { reply_markup: retryButton },
    );

    return;
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
  // TODO: modify it to calculate maxTotalOrdersCount and print to user without hints like Min: ..., Max: ...
  // (for your base coin amount).
  await ctx.reply(
    'Enter <b>total orders count</b>: how many parts the base coin amount will be splitted into.' +
      '\n\n<b>Example</b>:\n<b>Base coin amount</b>: <code>100</code> USDC\n<b>Total orders count</b>: <code>' +
      '4</code>\n<b>Sell per order</b>: <code>100</code> USDC / <code>4</code> = <code>25</code> USDC\n\n' +
      '<span class="tg-spoiler"><b>Hint</b>: <b>total orders count</b> must be less than <b>base coin amount</b> (' +
      `<b>${baseCoinAmount}</b>).` +
      '\n\n<b>Hint</b>: minimum total orders count is <b>2</b>.</span>',
    { reply_markup: closeConversation, parse_mode: 'HTML' },
  );

  const totalOrdersContext = await conversation.wait();
  const totalOrdersMessage = totalOrdersContext.msg?.text;
  const totalOrdersCallbackQueryData = totalOrdersContext.callbackQuery?.data;
  let totalOrders;

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

    const totalOrdersIsLessOrEqualThanBaseCoinAmount = new BigNumber(
      totalOrdersInt,
    ).isLessThanOrEqualTo(new BigNumber(baseCoinAmount));
    if (!totalOrdersIsLessOrEqualThanBaseCoinAmount) {
      await ctx.reply(
        `Total orders count must be less than base coin amount (<code>${baseCoinAmount}</code>), ` +
          `because minimum sell-per-order amount is <code>1</code> <b>${baseCoinSymbol}</b>.\n\nPlease, try again.`,
        { reply_markup: closeConversation, parse_mode: 'HTML' },
      );

      await conversation.skip({ drop: true });
    }

    const totalOrdersCountIsLessThanMin =
      totalOrdersInt < MIN_TOTAL_ORDERS_COUNT;
    if (totalOrdersCountIsLessThanMin) {
      await ctx.reply(
        `Total orders count cannot be lower than <code>${MIN_TOTAL_ORDERS_COUNT}</code>.`,
        {
          reply_markup: closeConversation,
          parse_mode: 'HTML',
        },
      );

      await conversation.skip({ drop: true });
    }

    const totalOrdersCountIsGreaterThanMax =
      totalOrdersInt > MAX_TOTAL_ORDERS_COUNT;
    if (totalOrdersCountIsGreaterThanMax) {
      await ctx.reply(
        `Total orders count cannot be greater than <code>${MAX_TOTAL_ORDERS_COUNT.toPrecision()}</code>.`,
        {
          reply_markup: closeConversation,
          parse_mode: 'HTML',
        },
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
      { parse_mode: 'HTML' },
    );

    return;
  }

  const oneOrderBaseCoinAmount = new BigNumber(baseCoinAmount)
    .dividedBy(totalOrders)
    .toFixed(4);
  console.debug('totalOrders:', totalOrders);

  // Logging all the entered DCA params and asking for confirmation
  const confirmWithCloseKeyboard = confirm.clone().add(...closeButtons);

  let priceRangeString: string;
  if (minPrice === defaultMinPrice && maxPrice === defaultMaxPrice) {
    priceRangeString = '.';
  } else if (minPrice !== defaultMinPrice && maxPrice === defaultMaxPrice) {
    priceRangeString = ` when <b>${quoteCoinSymbol}</b> price is greater (or equal) than <b>${minPrice}</b> <b>${baseCoinSymbol}</b>.`;
  } else if (minPrice === defaultMinPrice && maxPrice !== defaultMaxPrice) {
    priceRangeString = ` when <b>${quoteCoinSymbol}</b> price is less (or equal) than <b>${maxPrice}</b> <b>${baseCoinSymbol}</b>.`;
  } else {
    priceRangeString = ` when <b>${quoteCoinSymbol}</b> price is between <b>${minPrice}</b> and <b>${maxPrice}</b> <b>${baseCoinSymbol}</b>.`;
  }

  await ctx.reply(
    'Please, <b>confirm</b> you want to create the next <b>DCA</b>:\n\n' +
      `Buy <a href="${getSuiVisionCoinLink(validatedQuoteCoin.type)}"><b>${quoteCoinSymbol}</b></a> ` +
      `for ${oneOrderBaseCoinAmount} <a href="${getSuiVisionCoinLink(baseCoinType)}"><b>${baseCoinSymbol}</b></a> ` +
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
      maxPrice: convertToBNFormat(maxPrice, baseCoinDecimals),
      minPrice: convertToBNFormat(minPrice, baseCoinDecimals),
      quoteCoinType: validatedQuoteCoin.type,
      timeScale: timeUnit,
      totalOrders,
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

    await ctx.reply(
      `<b>DCA</b> is successfully created!\n\nhttps://suiscan.xyz/mainnet/tx/${resultOfExecution.digest}`,
      { reply_markup: showActiveDCAsWithRetryKeyboard, parse_mode: 'HTML' },
    );

    return;
  }

  if (resultOfExecution.result === 'failure' && resultOfExecution.digest) {
    await ctx.reply(
      `Failed to create <b>DCA</b>.\n\nhttps://suiscan.xyz/mainnet/tx/${resultOfExecution.digest}`,
      { reply_markup: retryButton, parse_mode: 'HTML' },
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
