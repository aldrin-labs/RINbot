import { CoinAssetData } from '@avernikoz/rinbot-sui-sdk';
import { Menu } from '@grammyjs/menu';
import { availableBalance, balance, home } from '../chains/sui.functions';
import { BotContext, CoinAssetDataExtended } from '../types';
import { calculate, formatTokenInfo, getPriceApi, isCoinAssetDataExtended } from '../chains/priceapi.utils';
import { isExponential } from '../chains/utils'

let currentTokenIndex: number = 0;
let currentToken: CoinAssetData;

function updateCurrentToken(ctx: BotContext, direction: 'next' | 'prev') {
  const assets = ctx.session.assets
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
  allCoinAssets.forEach(coin => {
    if (coin.price !== undefined) {
      netWorth += +coin.balance * coin.price;
    }
  });
  let totalNetWorth;
  if (netWorth === 0)
    totalNetWorth = ''
  else
    totalNetWorth = `\nYour Net Worth: <b>$${netWorth.toFixed(2)} USD</b>`;
  let priceApiDataStr: string;
  if (isCoinAssetDataExtended(currentToken)) {
    priceApiDataStr = formatTokenInfo(currentToken)
  } else {
    priceApiDataStr = '';
  }

  const suiBalance = await balance(ctx);
  const suiAvlBalance = await availableBalance(ctx);

  const newMessage = `🪙<a href="https://suiscan.xyz/mainnet/coin/${currentToken.type}/txs">${currentToken.symbol}</a>${priceApiDataStr}\n\nYour SUI balance: <b>${suiBalance}</b>\nYour available SUI balance: <b>${suiAvlBalance}</b>${totalNetWorth}\n\nShare: 🤖<a href="https://t.me/RINsui_bot">Trade ${currentToken.symbol} on RINSui_Bot</a>`;

  ctx.editMessageText(newMessage, { parse_mode: 'HTML', link_preview_options: { is_disabled: true } });
}

const positions_menu = new Menu<BotContext>('positions-menu')
  .text('Sell', async (ctx) => {
    ctx.session.step = 'sell';
    await ctx.conversation.enter('sell');
  })
  .row()
  .text('⬅️', async (ctx) => {
    updateCurrentToken(ctx, 'prev');
    await updateMessage(ctx);
  })
  .text((ctx) => {
    const assets = ctx.session.assets;
    const tokenToUse = currentToken ?? assets[currentTokenIndex];
    return tokenToUse.symbol ?? tokenToUse.type;
  })
  .text(
    '➡️',
    async (ctx) => {
      updateCurrentToken(ctx, 'next');
      await updateMessage(ctx);
    },
    (ctx) => ctx.menu.update(),
  )
  .row()
  .text('Home', async (ctx) => {
    await home(ctx);
  })
  .text('Refresh', async (ctx) => {
    try {
      if (isCoinAssetDataExtended(currentToken)) {
        const priceApiGetResponse = await getPriceApi('sui', currentToken.type)
        currentToken.price = priceApiGetResponse?.data.data.price
        await updateMessage(ctx)
      }
    } catch (error) {
      console.error(error)
    }
  });

export default positions_menu;
