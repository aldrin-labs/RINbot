import {
  CoinAssetData,
  isSuiCoinType,
  isValidSuiAddress,
  isValidTokenAmount,
} from '@avernikoz/rinbot-sui-sdk';
import BigNumber from 'bignumber.js';
import closeConversation from '../../../inline-keyboards/closeConversation';
import { retryAndGoHomeButtonsData } from '../../../inline-keyboards/retryConversationButtonsFactory';
import skip from '../../../inline-keyboards/skip';
import yesOrNo from '../../../inline-keyboards/yesOrNo';
import { BotContext, MyConversation } from '../../../types';
import { ConversationId } from '../../conversations.config';
import {
  getTransactionFromMethod,
  signAndExecuteTransactionAndReturnResult,
} from '../../conversations.utils';
import {
  TransactionResultStatus,
  getCetus,
  getCoinManager,
  getWalletManager,
} from '../../sui.functions';
import { CetusPool, SuiTransactionBlockResponse } from '../../types';
import {
  findCoinInAssets,
  getCetusPoolUrl,
  getSuiVisionTransactionLink,
} from '../../utils';

export async function addCetusLiquidity(
  conversation: MyConversation,
  ctx: BotContext,
): Promise<void> {
  await ctx.reply(
    'Enter a <b>pool address</b> to which you want to deposit liquidity.',
    { reply_markup: closeConversation, parse_mode: 'HTML' },
  );

  const retryButton =
    retryAndGoHomeButtonsData[ConversationId.AddCetusPoolLiquidity];
  const skipButton = skip.inline_keyboard[0];
  const closeWithSkipReplyMarkup = closeConversation.clone().add(...skipButton);

  const allCoinsAssets = await conversation.external(async () => {
    const walletManager = await getWalletManager();
    // TODO: Maybe we should add try/catch here as well
    const coinAssets = await walletManager.getAllCoinAssets(
      ctx.session.publicKey,
    );

    return coinAssets;
  });
  const cetus = await getCetus();

  let foundPool: CetusPool | null = null;
  await conversation.waitUntil(async (ctx) => {
    if (ctx.callbackQuery?.data === 'close-conversation') {
      return false;
    }

    const poolAddress = ctx.msg?.text ?? '';
    const poolAddressIsValid = isValidSuiAddress(poolAddress);

    if (!poolAddressIsValid) {
      await ctx.reply('Pool address is not valid. Please, try again.', {
        reply_markup: closeConversation,
      });

      return false;
    }

    const cetus = await getCetus();
    const pool = await cetus.getPool(poolAddress);

    if (pool === null) {
      await ctx.reply(
        'Cannot find pool with such address. Please, make sure it is correct and enter the valid one.',
        {
          reply_markup: closeConversation,
        },
      );

      return false;
    }

    const coinTypeA = pool.coinTypeA;
    const coinTypeB = pool.coinTypeB;
    const coinAIsFoundInAssets = findCoinInAssets(allCoinsAssets, coinTypeA);
    const coinBIsFoundInAssets = findCoinInAssets(allCoinsAssets, coinTypeB);

    if (
      coinAIsFoundInAssets === undefined ||
      coinBIsFoundInAssets === undefined
    ) {
      await ctx.reply(
        "You cannot add liquidity to this pool because you don't have all the needed coins.\n\nPlease, " +
          'enter another pool address.',
        { reply_markup: closeConversation },
      );

      return false;
    }

    foundPool = pool;

    return true;
  });

  // TODO: Add type guard
  // Note: The following check and type assertion exist due to limitations or issues in TypeScript type checking for this specific case.
  // The if statement is not expected to execute, and the type assertion is used to satisfy TypeScript's type system.
  if (foundPool === null) {
    await ctx.reply(
      'Pool address is not valid. Please, try again or contact support.',
      { reply_markup: retryButton },
    );

    return;
  }

  const poolToAddLiquidity = foundPool as CetusPool;
  const coinTypeA = poolToAddLiquidity.coinTypeA;
  const coinTypeB = poolToAddLiquidity.coinTypeB;
  const coinAInAssets = findCoinInAssets(allCoinsAssets, coinTypeA);
  const coinBInAssets = findCoinInAssets(allCoinsAssets, coinTypeB);

  // ts check
  if (coinAInAssets === undefined) {
    await ctx.reply(
      `Coin ${coinTypeA} is not found in your assets, but is required to add liquidity to this pool.\n\n` +
        'Please, try again or contact support.',
      { reply_markup: retryButton },
    );

    return;
  }

  // ts check
  if (coinBInAssets === undefined) {
    await ctx.reply(
      `Coin ${coinTypeB} is not found in your assets, but is required to add liquidity to this pool.\n\n` +
        'Please, try again or contact support.',
      { reply_markup: retryButton },
    );

    return;
  }

  let coinADecimals = coinAInAssets.decimals;
  let coinBDecimals = coinBInAssets.decimals;

  if (coinADecimals === null) {
    coinADecimals =
      (await conversation.external(async () => {
        const coinManager = await getCoinManager();
        const coinInfo = await coinManager.getCoinByType2(coinTypeA);

        return coinInfo?.decimals;
      })) ?? null;

    if (coinADecimals === null) {
      await ctx.reply(
        `Coin decimals not found for ${coinTypeA}. Please, use another pool to add liquidity or contact support.`,
        { reply_markup: closeConversation },
      );

      return;
    }
  }

  if (coinBDecimals === null) {
    coinBDecimals =
      (await conversation.external(async () => {
        const coinManager = await getCoinManager();
        const coinInfo = await coinManager.getCoinByType2(coinTypeB);

        return coinInfo?.decimals;
      })) ?? null;

    if (coinBDecimals === null) {
      await ctx.reply(
        `Coin decimals not found for ${coinTypeB}. Please, use another pool to add liquidity or contact support.`,
        { reply_markup: closeConversation },
      );

      return;
    }
  }

  // These reassignments are needed only to make TypeScript sure these variables are numbers.
  const coinDecimalsA = coinADecimals;
  const coinDecimalsB = coinBDecimals;

  await ctx.reply(
    'Enter a <b>price slippage</b> (in %).\n\n<b>Default</b>: <code>10</code>',
    { reply_markup: closeWithSkipReplyMarkup, parse_mode: 'HTML' },
  );

  const slippageContext = await conversation.waitUntil(async (ctx) => {
    if (ctx.callbackQuery?.data === 'close-conversation') {
      return false;
    }
    if (ctx.callbackQuery?.data === 'skip') {
      await ctx.answerCallbackQuery();
      return true;
    }

    const slippageText = ctx.msg?.text ?? '';
    const slippage = parseFloat(slippageText);

    if (isNaN(slippage)) {
      await ctx.reply('Slippage is not valid. Please, try again.', {
        reply_markup: closeConversation,
      });

      return false;
    }

    const slipageIsValid = slippage >= 0 && slippage <= 100;
    if (!slipageIsValid) {
      await ctx.reply(
        'Slippage must be in range between <code>0</code> and <code>100</code>.\n\nPlease, ' +
          'enter another value.',
        { reply_markup: closeConversation, parse_mode: 'HTML' },
      );

      return false;
    }

    return true;
  });
  const slippage =
    slippageContext.callbackQuery?.data === 'skip'
      ? 0.1
      : new BigNumber(slippageContext.msg?.text ?? '10')
          .dividedBy(100)
          .toNumber();

  // ts check
  if (isNaN(slippage)) {
    await ctx.reply(
      'Slippage is not valid. Please, try again or contact support.',
      { reply_markup: retryButton },
    );
  }

  const coinASymbol = coinAInAssets.symbol ?? coinTypeA;
  const coinBSymbol = coinBInAssets.symbol ?? coinTypeB;
  const coinABalance = coinAInAssets.balance;
  const coinAIsSui = isSuiCoinType(coinTypeA);
  const availableAmount = coinAIsSui
    ? await conversation.external(async () => {
        const walletManager = await getWalletManager();
        return await walletManager.getAvailableSuiBalance(
          ctx.session.publicKey,
        );
      })
    : coinABalance;

  await ctx.reply(
    `Reply with the amount of <b>${coinASymbol}</b> you wish to add in pool (<code>0</code> - ` +
      `<code>${availableAmount}</code> ${coinASymbol}).\n\nExample: <code>0.1</code>\n\n<span ` +
      `class="tg-spoiler"><b>Hint</b>: amount of <b>${coinBSymbol}</b> would be calculated automatically ` +
      'by <b>Cetus</b></span>',
    { reply_markup: closeConversation, parse_mode: 'HTML' },
  );

  let exactAmountA;
  let userConfirmedAmounts = false;
  do {
    const exactAmounts = await askForExactAmountToAddInPool({
      conversation,
      ctx,
      availableAmount,
      coinASymbol,
      coinBInAssets,
      coinBSymbol,
      coinDecimalsA,
      coinDecimalsB,
      pool: poolToAddLiquidity,
      slippage,
    });

    // ts check
    if (exactAmounts === null) {
      await ctx.reply(
        'Failed to process coin amounts to add liquidity. Please, try again or contact support.',
        { reply_markup: retryButton },
      );

      return;
    }

    const { amountA, amountB } = exactAmounts;

    await ctx.reply(
      `You are about to add liquidity to the pool with the following assets:` +
        `\n<code>${amountA}</code> <b>${coinASymbol}</b>\n` +
        `<code>${amountB}</code> <b>${coinBSymbol}</b>?`,
      { reply_markup: yesOrNo, parse_mode: 'HTML' },
    );

    const userAnswerContext =
      await conversation.waitForCallbackQuery(/^(yes|no)$/);
    const callbackQueryData = userAnswerContext.callbackQuery.data;

    if (callbackQueryData === 'no') {
      await userAnswerContext.answerCallbackQuery();

      await ctx.reply(
        `Please, enter another amount of <b>${coinASymbol}</b>.`,
        { reply_markup: closeConversation, parse_mode: 'HTML' },
      );

      continue;
    }
    if (callbackQueryData === 'yes') {
      userConfirmedAmounts = true;
      exactAmountA = amountA;

      await userAnswerContext.answerCallbackQuery();
    }
  } while (!userConfirmedAmounts);

  if (exactAmountA === undefined) {
    await ctx.reply(
      `Failed to process amount of <b>${coinASymbol}</b>. Please, try again or contact support.`,
      { reply_markup: retryButton, parse_mode: 'HTML' },
    );

    return;
  }

  await ctx.reply('Creating a transaction to add liquidity...');

  const addLiquidityTransaction = await getTransactionFromMethod({
    conversation,
    ctx,
    method: cetus.getAddLiquidityTransaction.bind(
      cetus,
    ) as typeof cetus.getAddLiquidityTransaction,
    params: {
      coinAmountA: exactAmountA,
      decimalsA: coinDecimalsA,
      decimalsB: coinDecimalsB,
      pool: poolToAddLiquidity,
      publicKey: ctx.session.publicKey,
      slippage,
    },
  });

  if (!addLiquidityTransaction) {
    await ctx.reply('Add liquidity transaction creation failed.', {
      reply_markup: retryButton,
    });

    return;
  }

  await ctx.reply('Adding liquidity...');

  const resultOfAddLiquidity: {
    transactionResult?: SuiTransactionBlockResponse;
    digest?: string;
    resultStatus: TransactionResultStatus;
    reason?: string;
  } = await signAndExecuteTransactionAndReturnResult({
    conversation,
    ctx,
    transaction: addLiquidityTransaction,
  });

  if (
    resultOfAddLiquidity.resultStatus === 'failure' &&
    resultOfAddLiquidity.transactionResult &&
    resultOfAddLiquidity.digest
  ) {
    await ctx.reply(
      `Failed to add liquidity.\n\n${getSuiVisionTransactionLink(resultOfAddLiquidity.digest)}`,
      { reply_markup: retryButton },
    );

    return;
  }

  if (
    resultOfAddLiquidity.resultStatus === 'failure' &&
    resultOfAddLiquidity.reason
  ) {
    await ctx.reply('Failed to send transaction for liquidity adding.', {
      reply_markup: retryButton,
    });

    return;
  }

  const { transactionResult } = resultOfAddLiquidity;

  // ts check
  if (transactionResult === undefined) {
    await ctx.reply(`Failed to add liquidity.`, { reply_markup: retryButton });

    return;
  }

  await ctx.reply(
    `Liquidity is successfully added to the pool!\n\n<a href=` +
      `"${getCetusPoolUrl(poolToAddLiquidity.poolAddress)}"><b>Pool</b></a>\n` +
      `<a href="${getSuiVisionTransactionLink(transactionResult.digest)}"><b>Transaction</b></a>`,
    { reply_markup: retryButton, parse_mode: 'HTML' },
  );

  return;
}

export async function askForExactAmountToAddInPool({
  conversation,
  ctx,
  availableAmount,
  coinDecimalsA,
  coinDecimalsB,
  coinASymbol,
  coinBSymbol,
  pool,
  slippage,
  coinBInAssets,
}: {
  conversation: MyConversation;
  ctx: BotContext;
  availableAmount: string;
  coinDecimalsA: number;
  coinDecimalsB: number;
  coinASymbol: string;
  coinBSymbol: string;
  pool: CetusPool;
  slippage: number;
  coinBInAssets: CoinAssetData;
}): Promise<{ amountA: string; amountB: string } | null> {
  const amountAContext = await conversation.wait();
  const amountA = amountAContext.msg?.text;
  const amountACallbackQueryData = amountAContext.callbackQuery?.data;

  if (amountACallbackQueryData === 'close-conversation') {
    await conversation.skip();
  }
  if (amountA !== undefined) {
    const { isValid: amountIsValid, reason } = isValidTokenAmount({
      amount: amountA,
      maxAvailableAmount: availableAmount,
      decimals: coinDecimalsA,
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

    // TODO: Now we open position near the current price of the pool and because of that `amountB` is
    // too large. We can fix this either by providing price range from user or by adding global liquidity.
    // (more in Cetus dev docs)
    const cetus = await getCetus();
    const { amountB } = cetus.getAddLiquidityPayload({
      pool,
      coinAmountA: amountA,
      decimalsA: coinDecimalsA,
      decimalsB: coinDecimalsB,
      slippage,
    });

    if (coinBInAssets.balance < amountB) {
      await ctx.reply(
        `You need <code>${amountB}</code> <b>${coinBSymbol}</b> to add <code>${amountA}</code> ` +
          `<b>${coinASymbol}</b>, but have only <code>${coinBInAssets.balance}</code> <b>${coinBSymbol}</b>.` +
          `\n\nPlease, enter the less amount of <b>${coinASymbol}</b> or buy more <b>${coinBSymbol}</b>.`,
        {
          reply_markup: closeConversation,
          parse_mode: 'HTML',
        },
      );

      await conversation.skip({ drop: true });
    }

    return { amountA, amountB };
  } else {
    await ctx.reply('Please, enter the amount.', {
      reply_markup: closeConversation,
    });

    await conversation.skip();
  }

  return null;
}
