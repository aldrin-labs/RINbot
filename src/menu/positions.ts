import { Menu } from '@grammyjs/menu';
import { ConversationId } from '../chains/conversations.config';
import {
  formatTokenInfo,
  getExtendedWithGetPriceApiResponseDataCoin,
  hasDefinedPrice,
} from '../chains/priceapi.utils';
import { availableBalance, balance, home } from '../chains/sui.functions';
import { instantBuy } from '../chains/trading/buy/buy';
import { BotContext, CoinAssetDataExtended } from '../types';
import { PriceApiClient } from '../chains/services/price-api';

let currentTokenIndex: number = 0;
let currentToken: CoinAssetDataExtended;

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

const positionsMenu = new Menu<BotContext>('positions-menu')
  .text('Home', async (ctx) => {
    await home(ctx);
  })
  .row()
  .text(
    (ctx) => {
      const userBalance = ctx.session.suiAsset.balance;
      return `Buy ${(parseFloat(userBalance) * 0.25).toPrecision(2)} SUI`;
    },
    async (ctx) => {
      const assets = ctx.session.assets;
      const userBalance = ctx.session.suiAsset.balance;
      const amount = parseFloat(userBalance) * 0.25;
      const tokenToUse = currentToken ?? assets[currentTokenIndex];

      ctx.session.tradeCoin = {
        coinType: tokenToUse.type,
        tradeAmountPercentage: amount.toString(),
        useSpecifiedCoin: true,
      };

      await instantBuy(ctx);
    },
  )
  .text(
    (ctx) => {
      const userBalance = ctx.session.suiAsset.balance;
      return `Buy ${(parseFloat(userBalance) * 0.5).toPrecision(2)} SUI`;
    },
    async (ctx) => {
      const assets = ctx.session.assets;
      const userBalance = ctx.session.suiAsset.balance;
      const amount = parseFloat(userBalance) * 0.5;
      const tokenToUse = currentToken ?? assets[currentTokenIndex];

      ctx.session.tradeCoin = {
        coinType: tokenToUse.type,
        tradeAmountPercentage: amount.toString(),
        useSpecifiedCoin: true,
      };

      await instantBuy(ctx);
    },
  )
  .text('Buy X SUI', async (ctx) => {
    const assets = ctx.session.assets;
    const tokenToUse = currentToken ?? assets[currentTokenIndex];

    ctx.session.tradeCoin = {
      coinType: tokenToUse.type,
      tradeAmountPercentage: '0',
      useSpecifiedCoin: true,
    };

    await ctx.conversation.enter(ConversationId.Buy);
  })
  .row()
  .dynamic(async (ctx, range) => {
    const assets = ctx.session.assets;
    currentToken = ctx.session.assets[currentTokenIndex];

    if (assets.length > 1) {
      range
        .text('⬅️', async (ctx) => {
          updateCurrentToken(ctx, 'prev');
          await updateMessage(ctx);
        })
        .text(async (ctx) => {
          const sessionAssets = ctx.session.assets;
          const tokenToUse = sessionAssets[currentTokenIndex];
          return tokenToUse.symbol ?? tokenToUse.type;
        })
        .text('➡️', async (ctx) => {
          updateCurrentToken(ctx, 'next');
          await updateMessage(ctx);
        });
    }
  })
  .row()
  .text('Sell 25%', async (ctx) => {
    const assets = ctx.session.assets;
    const tokenToUse = currentToken ?? assets[currentTokenIndex];

    ctx.session.tradeCoin = {
      coinType: tokenToUse.type,
      tradeAmountPercentage: '25',
      // TODO: Make it work by design.
      // Set `useSpecifiedCoin` to false, because it won't be changed in Sell conversation,
      // but can affect the next Buy conversation
      useSpecifiedCoin: false,
    };

    await ctx.conversation.enter(ConversationId.Sell);
  })
  .text('Sell 100%', async (ctx) => {
    const assets = ctx.session.assets;
    const tokenToUse = currentToken ?? assets[currentTokenIndex];

    ctx.session.tradeCoin = {
      coinType: tokenToUse.type,
      tradeAmountPercentage: '100',
      // TODO: Make it work by design.
      // Set `useSpecifiedCoin` to false, because it won't be changed in Sell conversation,
      // but can affect the next Buy conversation
      useSpecifiedCoin: false,
    };

    await ctx.conversation.enter(ConversationId.Sell);
  })
  .text('Sell X%', async (ctx) => {
    const assets = ctx.session.assets;
    const tokenToUse = currentToken ?? assets[currentTokenIndex];

    ctx.session.tradeCoin = {
      coinType: tokenToUse.type,
      tradeAmountPercentage: '0',
      // TODO: Make it work by design.
      // Set `useSpecifiedCoin` to false, because it won't be changed in Sell conversation,
      // but can affect the next Buy conversation
      useSpecifiedCoin: false,
    };

    await ctx.conversation.enter(ConversationId.Sell);
  })
  .row()
  .dynamic(async (ctx, range) => {
    const assets = ctx.session.assets;
    const tokenToUse = currentToken ?? assets[currentTokenIndex];
    range.url('SUIScan.xyz', `https://suiscan.xyz/coin/${tokenToUse.type}`);
  })
  .row()
  .text('Refresh', async (ctx) => {
    try {
      const priceApiGetResponse = await PriceApiClient.getInstance().getPrice('sui', currentToken.type);

      if (priceApiGetResponse === undefined) {
        console.warn('[Refresh] priceApiGetResponse is undefined, cannot refresh coin data.');
        return;
      }

      currentToken = getExtendedWithGetPriceApiResponseDataCoin(currentToken, priceApiGetResponse);

      await updateMessage(ctx);
    } catch (error) {
      if (error instanceof Error) {
        console.error('[Refresh] Price API error:', error.message);
      } else {
        console.error('[Refresh] Price API error: unknown error');
      }
    }
  });

export default positionsMenu;
