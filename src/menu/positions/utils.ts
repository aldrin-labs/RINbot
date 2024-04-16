import { ConversationId } from '../../chains/conversations.config';
import {
  formatTokenInfo,
  getExtendedWithGetPriceApiResponseDataCoin,
  getPriceApi,
  hasDefinedPrice,
} from '../../chains/priceapi.utils';
import { availableBalance, balance } from '../../chains/sui.functions';
import { BotContext } from '../../types';

export async function updateMessage(ctx: BotContext) {
  const { data: allCoinAssets, currentIndex } = ctx.session.assets;
  const currentToken = allCoinAssets[currentIndex];
  let netWorth = 0;
  allCoinAssets.forEach((coin) => {
    if (coin.price !== undefined) {
      netWorth += +coin.balance * coin.price;
    }
  });
  let totalNetWorth;
  if (netWorth === 0) totalNetWorth = '';
  else totalNetWorth = `\nYour Net Worth: <b>$${netWorth.toFixed(2)} USD</b>`;
  let priceApiDataStr: string;
  if (hasDefinedPrice(currentToken)) {
    priceApiDataStr = formatTokenInfo(currentToken);
  } else {
    priceApiDataStr = `\n\nToken Balance: <b>${currentToken.balance} ${currentToken.symbol || currentToken.type}</b>`;
  }

  const suiBalance = await balance(ctx);
  const suiAvlBalance = await availableBalance(ctx);

  const newMessage =
    `🪙 <a href="https://suiscan.xyz/mainnet/coin/${currentToken.type}/txs">` +
    `${currentToken.symbol}</a>${priceApiDataStr}\n\nYour SUI balance: <b>${suiBalance}</b>\n` +
    `Your available SUI balance: <b>${suiAvlBalance}</b>${totalNetWorth}\n\n` +
    `Share: 🤖<a href="https://t.me/RINsui_bot">Trade ${currentToken.symbol} on RINSui_Bot</a>`;

  try {
    await ctx.editMessageText(newMessage, {
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
    });
  } catch {}
}

export async function updateCurrentToken(ctx: BotContext, direction: 'next' | 'prev') {
  const { currentIndex, data } = ctx.session.assets;

  if (data.length !== 1) {
    if (direction === 'prev') {
      const prevIndex = currentIndex - 1;
      ctx.session.assets.currentIndex = prevIndex < 0 ? data.length - 1 : prevIndex;
    } else {
      const nextIndex = currentIndex + 1;
      ctx.session.assets.currentIndex = nextIndex === data.length ? 0 : nextIndex;
    }

    await updateMessage(ctx);
  }
}

export async function buyFromPositionsMenu({
  absoluteAmountPercentage = 0,
  ctx,
}: {
  ctx: BotContext;
  absoluteAmountPercentage?: number;
}) {
  const { currentIndex, data } = ctx.session.assets;
  const currentToken = data[currentIndex];
  const userBalance = ctx.session.suiAsset.balance;
  const amount = parseFloat(userBalance) * absoluteAmountPercentage;

  ctx.session.tradeCoin = {
    coinType: currentToken.type,
    tradeAmountPercentage: amount.toString(),
    useSpecifiedCoin: true,
  };

  await ctx.conversation.enter(ConversationId.InstantBuy);
}

export async function sellFromPositionsMenu({
  ctx,
  sellPercentage = '0',
}: {
  ctx: BotContext;
  sellPercentage?: string;
}) {
  const { currentIndex, data } = ctx.session.assets;
  const currentToken = data[currentIndex];

  ctx.session.tradeCoin = {
    coinType: currentToken.type,
    tradeAmountPercentage: sellPercentage,
    // TODO: Make it work by design.
    // Set `useSpecifiedCoin` to false, because it won't be changed in Sell conversation,
    // but can affect the next Buy conversation
    useSpecifiedCoin: false,
  };

  await ctx.conversation.enter(ConversationId.Sell);
}

export async function refreshCurrentAsset(ctx: BotContext) {
  try {
    const { currentIndex, data } = ctx.session.assets;
    let currentToken = data[currentIndex];

    const priceApiGetResponse = await getPriceApi('sui', currentToken.type);

    if (priceApiGetResponse === undefined) {
      console.warn('[Refresh] priceApiGetResponse is undefined, cannot refresh coin data.');
      return;
    }

    currentToken = getExtendedWithGetPriceApiResponseDataCoin(currentToken, priceApiGetResponse.data.data);

    await updateMessage(ctx);
  } catch (error) {
    if (error instanceof Error) {
      console.error('[Refresh] Price API error:', error.message);
    } else {
      console.error('[Refresh] Price API error: unknown error');
    }
  }
}
