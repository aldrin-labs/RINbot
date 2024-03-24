import { CoinAssetData } from '@avernikoz/rinbot-sui-sdk';
import { Menu } from '@grammyjs/menu';
import { ConversationId } from '../chains/conversations.config';
import {
  formatTokenInfo,
  getPriceApi,
  isCoinAssetDataExtended,
} from '../chains/priceapi.utils';
import { availableBalance, balance, home } from '../chains/sui.functions';
import { getSuiScanCoinLink } from '../chains/utils';
import { BotContext } from '../types';

let currentTokenIndex: number = 0;
let currentToken: CoinAssetData;

const positions_menu = new Menu<BotContext>('positions-menu')
  .text('Home', async (ctx) => {
    await home(ctx);
  })
  .text('Close', async (ctx) => {
    await home(ctx);
  })
  .row()
  .text(
    (ctx) => {
      const userBalance = ctx.session.suiAsset.balance;
      return `Buy ${(parseFloat(userBalance) * 0.25).toPrecision(2)} SUI`;
    },
    async (ctx) => {
      await handleBuyAction(ctx, 0.25);
    },
  )
  .text(
    (ctx) => {
      const userBalance = ctx.session.suiAsset.balance;
      return `Buy ${(parseFloat(userBalance) * 0.5).toPrecision(2)} SUI`;
    },
    async (ctx) => {
      await handleBuyAction(ctx, 0.5);
    },
  )
  .text('Buy X SUI', async (ctx) => {
    await handleBuyAction(ctx);
  })
  .row()
  .dynamic(async (ctx, component) => {
    const assets = ctx.session.assets;
    if (assets.length > 1) {
      component.text('⬅️', async (ctx) => {
        updateCurrentToken(ctx, 'prev');
        await updateMessage(ctx);
      });
    }
  })
  .text(async (ctx) => {
    const sessionAssets = ctx.session.assets;
    const tokenToUse = currentToken ?? sessionAssets[currentTokenIndex];
    return tokenToUse.symbol ?? tokenToUse.type;
  })
  .dynamic(async (ctx, component) => {
    const assets = ctx.session.assets;
    if (assets.length > 1) {
      component.text('➡️', async (ctx) => {
        updateCurrentToken(ctx, 'next');
        await updateMessage(ctx);
      });
    }
  })
  .row()
  .text('Sell 25%', async (ctx) => {
    await handleSellAction(ctx, '25');
  })
  .text('Sell 100%', async (ctx) => {
    await handleSellAction(ctx, '100');
  })
  .text('Sell X%', async (ctx) => {
    await handleSellAction(ctx, '0');
  })
  .row()
  .dynamic(async (ctx, range) => {
    const assets = ctx.session.assets;
    const tokenToUse = currentToken ?? assets[currentTokenIndex];
    range.url('SUIScan.xyz', getSuiScanCoinLink(tokenToUse.type));
  })
  .row()
  .text('Refresh', async (ctx) => {
    try {
      if (isCoinAssetDataExtended(currentToken)) {
        const priceApiGetResponse = await getPriceApi('sui', currentToken.type);
        currentToken.price = priceApiGetResponse?.data.data.price;
        await updateMessage(ctx);
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error('[Refresh] Price API error:', error.message);
      } else {
        console.error('[Refresh] Price API error: unknown error');
      }
    }
  });

export default positions_menu;

function updateCurrentToken(ctx: BotContext, direction: 'next' | 'prev') {
  const assets = ctx.session.assets;
  if (direction === 'next') {
    currentTokenIndex = (currentTokenIndex + 1) % assets.length;
  } else {
    currentTokenIndex = (currentTokenIndex - 1 + assets.length) % assets.length;
  }

  currentToken = assets[currentTokenIndex];
}

async function updateMessage(ctx: BotContext) {
  const allCoinAssets = ctx.session.assets;
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
  if (isCoinAssetDataExtended(currentToken)) {
    priceApiDataStr = formatTokenInfo(currentToken);
  } else {
    priceApiDataStr = '';
  }

  const suiBalance = await balance(ctx);
  const suiAvlBalance = await availableBalance(ctx);

  const newMessage = `🪙<a href="${getSuiScanCoinLink(currentToken.type)}">${currentToken.symbol}</a>${priceApiDataStr}\n\nYour SUI balance: <b>${suiBalance}</b>\nYour available SUI balance: <b>${suiAvlBalance}</b>${totalNetWorth}\n\nShare: 🤖<a href="https://t.me/RINsui_bot">Trade ${currentToken.symbol} on RINSui_Bot</a>`;
  try {
    await ctx.editMessageText(newMessage, {
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
    });
  } catch (e) {
    console.log('handled error', e);
  }
}

/**
 * @param absolutePercentage Example: 0.5 (meaning 50%)
 */
async function handleBuyAction(ctx: BotContext, absolutePercentage?: number) {
  const assets = ctx.session.assets;
  const userBalance = ctx.session.suiAsset.balance;
  const tokenToUse = currentToken ?? assets[currentTokenIndex];

  ctx.session.tradeCoin.coinType = tokenToUse.type;
  ctx.session.tradeCoin.useSpecifiedCoin = true;

  if (absolutePercentage !== undefined) {
    const amount = parseFloat(userBalance) * absolutePercentage;
    ctx.session.tradeCoin.tradeAmount = amount.toString();
  }

  await ctx.conversation.enter(
    absolutePercentage !== undefined
      ? ConversationId.InstantBuy
      : ConversationId.Buy,
  );
}

/**
 * @param percentage Example: 25 (meaning 25%)
 */
async function handleSellAction(ctx: BotContext, percentage: string) {
  const assets = ctx.session.assets;
  const tokenToUse = currentToken ?? assets[currentTokenIndex];

  ctx.session.tradeCoin.coinType = tokenToUse.type;
  ctx.session.tradeCoin.tradeAmountPercentage = percentage;
  ctx.session.tradeCoin.useSpecifiedCoin = true;

  await ctx.conversation.enter(ConversationId.Sell);
}
