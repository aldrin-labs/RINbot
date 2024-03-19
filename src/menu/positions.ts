import { CoinAssetData } from '@avernikoz/rinbot-sui-sdk';
import { Menu } from '@grammyjs/menu';
import { availableBalance, balance, home } from '../chains/sui.functions';
import { BotContext, CoinAssetDataExtended } from '../types';
import { calculate, isCoinAssetDataExtended } from '../chains/priceapi.utils';

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

    const priceApiDataStr = isCoinAssetDataExtended(currentToken) && calculate(currentToken.balance, currentToken.price) !== null ? `\n\nToken Price: <b>${currentToken.price}</b>\nToken Balance: <b>${currentToken.balance + " " + currentToken.symbol + " / " + calculate(currentToken.balance, currentToken.price) + " USD"}</b>${currentToken.mcap === 0 ? '' : "\nMcap: <b>" + currentToken.mcap + "</b>\n"}${currentToken.priceChange1h === 0 ? '' : "\n1h: <b>" + (currentToken.priceChange1h! > 0 ? "+" + currentToken.priceChange1h : currentToken.priceChange1h) + "</b>"} ${currentToken.priceChange24h === 0 ? '' : " 24h: <b>" + (currentToken.priceChange24h! > 0 ? "+" + currentToken.priceChange24h : currentToken.priceChange24h) + "</b>"}` : ``

    const suiBalance = await balance(ctx)
    const suiAvlBalance = await availableBalance(ctx)

    const newMessage = `Positions Overview:\n\n<a href="https://suiscan.xyz/mainnet/coin/${currentToken.type}/txs">${currentToken.symbol}</a>${priceApiDataStr}\n\nYour SUI balance: <b>${suiBalance}</b>\nYour available SUI balance: <b>${suiAvlBalance}</b>\nNet Worth: {Net Worth here}\n\nShare: 🤖<a href="https://t.me/RINsui_bot">Trade ${currentToken.symbol} on RINSui_Bot</a>`

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
