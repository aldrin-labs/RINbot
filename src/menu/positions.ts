import { CoinAssetData } from '@avernikoz/rinbot-sui-sdk';
import { Menu } from '@grammyjs/menu';
import { availableBalance, balance, home } from '../chains/sui.functions';
import { BotContext, CoinAssetDataExtended } from '../types';
import { calculate, isCoinAssetDataExtended } from '../chains/priceapi.utils';
import { isExponential } from '../chains/utils'

let currentTokenIndex: number = 0;
let currentToken: CoinAssetData;

function nextToken(assets: CoinAssetDataExtended[]) {
  currentTokenIndex++;
  if (currentTokenIndex === assets.length) {
    currentTokenIndex = 0;
    currentToken = assets[currentTokenIndex];
  }
  currentToken = assets[currentTokenIndex];
}

function prevToken(assets: CoinAssetDataExtended[]) {
  currentTokenIndex--;
  if (currentTokenIndex < 0) {
    currentTokenIndex = assets.length - 1;
    currentToken = assets[currentTokenIndex];
  }
  currentToken = assets[currentTokenIndex];
}

const positions_menu = new Menu<BotContext>('positions-menu')
  .text('Sell', async (ctx) => {
    ctx.session.step = 'sell';
    await ctx.conversation.enter('sell');
  })
  .row()
  .text('⬅️', async (ctx) => {
    prevToken(ctx.session.assets);

    const allCoinAssets = ctx.session.assets

    let netWorth = 0;
    allCoinAssets.forEach(coin => {
      if (coin.price !== undefined) {
        netWorth += +coin.balance * coin.price;
      }
    });

    const totalNetWorth = `\nYour Net Worth: <b>$${netWorth.toFixed(2)} USD</b>`
    let priceApiDataStr: string;
    let tokenPrice: string;
    if (isCoinAssetDataExtended(currentToken)) {
      if (currentToken.price && isExponential(currentToken.price))
        tokenPrice = currentToken.price.toFixed(10)
      priceApiDataStr = calculate(currentToken.balance, currentToken.price) !== null ? `\n\nToken Price: <b>${currentToken.price} USD</b>\nToken Balance: <b>${currentToken.balance + " " + currentToken.symbol + " / " + calculate(currentToken.balance, currentToken.price) + " USD"}</b>${currentToken.mcap === 0 ? '' : "\nMcap: <b>" + calculate("1", currentToken.mcap) + " USD</b>\n"}${currentToken.priceChange1h === 0 ? '' : "\n1h: <b>" + (currentToken.priceChange1h! > 0 ? "+" + currentToken.priceChange1h : currentToken.priceChange1h) + "</b>"} ${currentToken.priceChange24h === 0 ? '' : " 24h: <b>" + (currentToken.priceChange24h! > 0 ? "+" + currentToken.priceChange24h : currentToken.priceChange24h) + "</b>"}` : ``
    }
    else {
      priceApiDataStr = ''
      tokenPrice = ''
    }

    const suiBalance = await balance(ctx)
    const suiAvlBalance = await availableBalance(ctx)

    const newMessage = `<a href="https://suiscan.xyz/mainnet/coin/${currentToken.type}/txs">${currentToken.symbol}</a>${priceApiDataStr}\n\nYour SUI balance: <b>${suiBalance}</b>\nYour available SUI balance: <b>${suiAvlBalance}</b>${totalNetWorth}\n\nShare: 🤖<a href="https://t.me/RINsui_bot">Trade ${currentToken.symbol} on RINSui_Bot</a>`

    ctx.editMessageText(newMessage, { parse_mode: 'HTML', link_preview_options: { is_disabled: true } });
  })
  .text((ctx) => {
    const assets = ctx.session.assets;
    const tokenToUse = currentToken ?? assets[currentTokenIndex];

    return tokenToUse.symbol ?? tokenToUse.type;
  })
  .text(
    '➡️',
    (ctx) => {
      nextToken(ctx.session.assets);

      const newMessage = currentToken.symbol
        ? `<b>${currentToken.symbol}</b> | <code>${currentToken.type}</code> | <code>${currentToken.balance}</code>`
        : `<code>${currentToken.type}</code> | <code>${currentToken.balance}</code>`;

      ctx.editMessageText(newMessage, { parse_mode: 'HTML' });
    },
    (ctx) => ctx.menu.update(),
  )
  .row()
  .text('Home', async (ctx) => {
    await home(ctx);
  })
  .text('Refresh', async (ctx) => {

  });

export default positions_menu;
