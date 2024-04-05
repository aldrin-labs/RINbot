import { SUI_DECIMALS, isSuiCoinType, isValidTokenAddress, isValidTokenAmount } from '@avernikoz/rinbot-sui-sdk';
import { InlineKeyboard } from 'grammy';
import { EndConversationError } from '../../../errors/end-conversation.error';
import closeConversation from '../../../inline-keyboards/closeConversation';
import { BotContext, MyConversation } from '../../../types';
import { CallbackQueryData } from '../../../types/callback-queries-data';
import { RINBOT_CHAT_URL, RINCEL_COIN_TYPE } from '../../sui.config';
import { getCoinManager, getWalletManager } from '../../sui.functions';
import {
  extractCoinTypeFromLink,
  getCoinWhitelist,
  getPriceOutputData,
  getSuiScanCoinLink,
  isValidCoinLink,
  reactOnUnexpectedBehaviour,
  userMustUseCoinWhitelist,
} from '../../utils';

export async function askForCoinToBuy({
  ctx,
  conversation,
  retryButton,
}: {
  ctx: BotContext;
  conversation: MyConversation;
  retryButton: InlineKeyboard;
}): Promise<string> {
  await ctx.reply('What coin do you want to buy? Please send a coin type or a link to suiscan.', {
    reply_markup: closeConversation,
  });

  await ctx.reply(
    'Example of coin type format:\n' +
      `<code>${RINCEL_COIN_TYPE}</code>\n\n` +
      `Example of suiscan link:\n${getSuiScanCoinLink(RINCEL_COIN_TYPE)}`,
    { parse_mode: 'HTML' },
  );

  const coinToBuyContext = await conversation.wait();
  const coinToBuyCallbackQueryData = coinToBuyContext.callbackQuery?.data;
  const coinToBuyMessage = coinToBuyContext.msg?.text;

  if (coinToBuyCallbackQueryData === CallbackQueryData.Cancel) {
    await conversation.skip();
    throw new EndConversationError();
  } else if (coinToBuyCallbackQueryData !== undefined || coinToBuyMessage === undefined) {
    await reactOnUnexpectedBehaviour(coinToBuyContext, retryButton, 'buy');
    throw new EndConversationError();
  }

  const possibleCoin = coinToBuyMessage.trim();
  const coinTypeIsValid = isValidTokenAddress(possibleCoin);
  const suiScanLinkIsValid = isValidCoinLink(possibleCoin);

  if (!coinTypeIsValid && !suiScanLinkIsValid) {
    await ctx.reply('Coin type or suiscan link is not correct. Please, enter a valid one.', {
      reply_markup: closeConversation,
    });

    await conversation.skip({ drop: true });
  }

  const coinType: string | null = coinTypeIsValid ? possibleCoin : extractCoinTypeFromLink(possibleCoin);

  if (coinType === null) {
    await ctx.reply(
      'Suiscan link is not valid. Make sure it is correct.\n\nYou can enter a coin type or a suiscan link.',
      { reply_markup: closeConversation },
    );

    await conversation.skip({ drop: true });
    throw new EndConversationError();
  }

  const fetchedCoin = await conversation.external(async () => {
    const coinManager = await getCoinManager();
    return await coinManager.getCoinByType2(coinType);
  });

  if (fetchedCoin === null) {
    await ctx.reply('Coin with this coin type is not found. Please, make sure it is correct or enter a suiscan link.', {
      reply_markup: closeConversation,
    });

    await conversation.skip({ drop: true });
    throw new EndConversationError();
  }

  const tokenToBuyIsSui: boolean = isSuiCoinType(fetchedCoin.type);

  if (tokenToBuyIsSui) {
    await ctx.reply(`You cannot buy <b>SUI</b> for <b>SUI</b>. Please, specify another coin to buy.`, {
      reply_markup: closeConversation,
      parse_mode: 'HTML',
    });

    await conversation.skip({ drop: true });
  }

  if (userMustUseCoinWhitelist(ctx)) {
    const coinWhitelist = await conversation.external(() => getCoinWhitelist());

    if (coinWhitelist === null) {
      await ctx.reply('Failed to fetch coin whitelist. Please, try again later or contact support.', {
        reply_markup: closeConversation,
      });

      await conversation.skip({ drop: true });
      throw new EndConversationError();
    }

    const requiredCoinInWhitelist = coinWhitelist.find((coin) => coin.type === fetchedCoin.type);

    if (requiredCoinInWhitelist === undefined) {
      await ctx.reply(
        'This coin is not in the whitelist. Please, specify another one or contact support.\n\n' +
          '<span class="tg-spoiler"><b>Hint</b>: you can request coin whitelisting in ' +
          `<a href="${RINBOT_CHAT_URL}">RINbot_chat</a>.</span>`,
        {
          reply_markup: closeConversation,
          parse_mode: 'HTML',
          link_preview_options: { is_disabled: true },
        },
      );

      await conversation.skip({ drop: true });
    }
  }

  return fetchedCoin.type;
}

export async function askForAmountToSpendOnBuy({
  ctx,
  conversation,
  buyCoinType,
  retryButton,
}: {
  ctx: BotContext;
  conversation: MyConversation;
  buyCoinType: string;
  retryButton: InlineKeyboard;
}): Promise<string> {
  const availableBalance = await conversation.external(async () => {
    const walletManager = await getWalletManager();
    // TODO: Maybe we should add try/catch here as well
    return await walletManager.getAvailableSuiBalance(conversation.session.publicKey);
  });

  const priceOutput = await conversation.external({
    args: [buyCoinType],
    task: (validatedCoinType: string) => getPriceOutputData(validatedCoinType),
  });

  await ctx.reply(
    `${priceOutput}Reply with the amount you wish to spend (<code>0</code> - ` +
      `<code>${availableBalance}</code> SUI).\n\nExample: <code>0.1</code>`,
    { reply_markup: closeConversation, parse_mode: 'HTML' },
  );

  const amountContext = await conversation.wait();
  const amountCallbackQueryData = amountContext.callbackQuery?.data;
  const amount = amountContext.msg?.text;

  if (amountCallbackQueryData === CallbackQueryData.Cancel) {
    await conversation.skip();
    throw new EndConversationError();
  } else if (amountCallbackQueryData !== undefined || amount === undefined) {
    await reactOnUnexpectedBehaviour(amountContext, retryButton, 'buy');
    throw new EndConversationError();
  }

  const { isValid: amountIsValid, reason } = isValidTokenAmount({
    amount,
    maxAvailableAmount: availableBalance,
    decimals: SUI_DECIMALS,
  });

  if (!amountIsValid) {
    await ctx.reply(`Invalid amount. Reason: ${reason}\n\nPlease, try again.`, { reply_markup: closeConversation });

    await conversation.skip({ drop: true });
  }

  return amount;
}
