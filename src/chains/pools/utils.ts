import { CoinAssetData, CoinManagerSingleton, isSuiCoinType, isValidTokenAddress } from '@avernikoz/rinbot-sui-sdk';
import { InlineKeyboard } from 'grammy';
import closeConversation from '../../inline-keyboards/closeConversation';
import tickSpacingKeyboard from '../../inline-keyboards/tickSpacing';
import { BotContext, MyConversation } from '../../types';
import { RINCEL_COIN_TYPE } from '../sui.config';
import { CoinForPool } from '../types';
import { extractCoinTypeFromLink, getSuiScanCoinLink, isCoinForPool, isValidCoinLink } from '../utils';

export async function askForCoinInPool({
  conversation,
  ctx,
  coinManager,
  allCoinsAssets,
  retryButton,
  stringifiedNumber,
  firstCoinType,
}: {
  conversation: MyConversation;
  ctx: BotContext;
  coinManager: CoinManagerSingleton;
  allCoinsAssets: CoinAssetData[];
  retryButton: InlineKeyboard;
  stringifiedNumber: 'first' | 'second';
  firstCoinType?: string;
}): Promise<CoinForPool | undefined> {
  await ctx.reply(
    `What would be <b>the ${stringifiedNumber} coin</b> in pool? Please send a coin type or a link to suiscan.`,
    { reply_markup: closeConversation, parse_mode: 'HTML' },
  );

  await ctx.reply(
    'Example of coin type format:\n' +
      `<code>${RINCEL_COIN_TYPE}</code>\n\n` +
      `Example of suiscan link:\n${getSuiScanCoinLink(RINCEL_COIN_TYPE)}`,
    { parse_mode: 'HTML' },
  );

  let validatedCoin: CoinForPool | null = null;
  await conversation.waitUntil(async (ctx) => {
    if (ctx.callbackQuery?.data === 'close-conversation') {
      return false;
    }

    const possibleCoin = (ctx.msg?.text || '').trim();
    const coinTypeIsValid = isValidTokenAddress(possibleCoin);
    const suiScanLinkIsValid = isValidCoinLink(possibleCoin);

    if (!coinTypeIsValid && !suiScanLinkIsValid) {
      const replyText =
        'Coin address or suiscan link is not correct. Make sure inputed data is correct.\n\n' +
        'You can enter a coin type or a Suiscan link.';

      await ctx.reply(replyText, { reply_markup: closeConversation });

      return false;
    }

    const coinType: string | null = coinTypeIsValid ? possibleCoin : extractCoinTypeFromLink(possibleCoin);

    // ts check
    if (coinType === null) {
      await ctx.reply(
        'Suiscan link is not valid. Make sure it is correct.\n\nYou can enter a coin type or a Suiscan link.',
        { reply_markup: closeConversation },
      );
      return false;
    }

    const fetchedCoin = await coinManager.getCoinByType2(coinType);

    if (fetchedCoin === null) {
      await ctx.reply(
        `Coin type not found. Make sure type "${coinType}" is correct.\n\nYou can enter a coin type or a Suiscan link.`,
        { reply_markup: closeConversation },
      );

      return false;
    }

    if (stringifiedNumber === 'second' && firstCoinType !== undefined) {
      const firstCoinIsSui = isSuiCoinType(firstCoinType);
      const secondCoinIsSui = isSuiCoinType(coinType);
      const firstAndSecondCoinsAreEqual = (firstCoinIsSui && secondCoinIsSui) || firstCoinType === coinType;

      if (firstAndSecondCoinsAreEqual) {
        await ctx.reply(
          'The second coin in pool must be not the first one. Please, specify another coin to add in pool.',
          { reply_markup: closeConversation },
        );

        return false;
      }
    }

    const foundCoin = allCoinsAssets.find(
      (asset) => (isSuiCoinType(asset.type) && isSuiCoinType(coinType)) || asset.type === coinType,
    );

    if (foundCoin === undefined) {
      await ctx.reply('Coin is not found in your wallet assets. Please, specify another coin to add in pool.', {
        reply_markup: closeConversation,
      });

      return false;
    }

    validatedCoin = {
      symbol: fetchedCoin.symbol,
      balance: foundCoin.balance,
      decimals: fetchedCoin.decimals,
      type: fetchedCoin.type,
    };
    return true;
  });

  // Note: The following check and type assertion exist due to limitations or issues in TypeScript type checking
  // for this specific case.
  // The if statement is not expected to execute, and the type assertion is used to satisfy TypeScript's type system.
  if (!isCoinForPool(validatedCoin)) {
    await ctx.reply('Specified coin cannot be found.\n\nPlease, try again and specify another one.', {
      reply_markup: retryButton,
    });

    return;
  }

  const validatedCoinToAdd = validatedCoin as CoinForPool;
  console.debug('validatedCoinToAdd:', validatedCoinToAdd);

  return validatedCoinToAdd;
}

export async function askForPoolPrice({
  conversation,
  ctx,
  firstCoin,
  secondCoin,
}: {
  conversation: MyConversation;
  ctx: BotContext;
  firstCoin: CoinForPool;
  secondCoin: CoinForPool;
}): Promise<string | undefined> {
  await ctx.reply(
    `Enter the <b>pool price</b>.\n\n<span class="tg-spoiler"><b>Hint</b>: pool price means how ` +
      `much <b>${secondCoin.symbol ?? secondCoin.type}</b> is needed to buy ` +
      `<b>1 ${firstCoin.symbol ?? firstCoin.type}</b></span>`,
    { parse_mode: 'HTML', reply_markup: closeConversation },
  );

  const priceMessage = await conversation.waitUntil(async (ctx) => {
    if (ctx.callbackQuery?.data === 'close-conversation') {
      return false;
    }

    const price = ctx.msg?.text ?? '';
    const priceNumber = parseFloat(price);

    if (isNaN(priceNumber)) {
      await ctx.reply('Invalid pool price. Please, try again.', {
        reply_markup: closeConversation,
      });

      return false;
    }

    const priceIsValid = priceNumber > 0 && priceNumber < Number.MAX_SAFE_INTEGER;
    if (!priceIsValid) {
      await ctx.reply(
        'Pool price must meet the following conditions:\n<code>0</code> <b>&lt; price &lt;</b> ' +
          '<code>9007199254740991</code>.\n\nPlease, try again.',
        { reply_markup: closeConversation, parse_mode: 'HTML' },
      );

      return false;
    }

    return true;
  });

  return parseFloat(priceMessage.msg?.text ?? '').toString();
}

export async function askForTickSpacing({
  conversation,
  ctx,
}: {
  conversation: MyConversation;
  ctx: BotContext;
}): Promise<string | undefined> {
  const closeConvButtons = closeConversation.inline_keyboard[0];
  const tickSpacingWithCloseConvKeyboard = tickSpacingKeyboard
    .clone()
    .row()
    .add(...closeConvButtons);

  await ctx.reply(
    'Choose a <b>tick spacing</b> for your pool.\n\n<span class="tg-spoiler"><b>Hint</b>: tick spacing will ' +
      'affect price precision. Each tick spacing correspond different fee rate.\n\n<b>Tick Spacing &#8213; ' +
      'Fee Rate</b>\n2\t\t&#8213;\t\t0.01%\n10\t\t&#8213;\t\t0.05%\n60\t\t&#8213;\t\t0.25%\n200\t\t' +
      '&#8213;\t\t1%</span>',
    {
      reply_markup: tickSpacingWithCloseConvKeyboard,
      parse_mode: 'HTML',
    },
  );

  const tickSpacingMessage = await conversation.waitUntil(async (ctx) => {
    const callbackQueryData = ctx.callbackQuery?.data;
    const isTickSpacingRegExp = /^(2|10|60|200)$/;

    if (callbackQueryData === 'close-conversation') {
      return false;
    }

    if (isTickSpacingRegExp.test(callbackQueryData ?? '')) {
      await ctx.answerCallbackQuery();
      return true;
    }

    await ctx.reply('Please, click on the button.', {
      reply_markup: closeConversation,
    });

    return false;
  });

  return tickSpacingMessage.callbackQuery?.data;
}
