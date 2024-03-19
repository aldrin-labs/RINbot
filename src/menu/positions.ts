import { CoinAssetData } from '@avernikoz/rinbot-sui-sdk';
import { Menu } from '@grammyjs/menu';
import { home } from '../chains/sui.functions';
import { BotContext } from '../types';

let currentTokenIndex: number = 0;
let currentToken: CoinAssetData;

function nextToken(assets: CoinAssetData[]) {
  currentTokenIndex++;
  if (currentTokenIndex === assets.length) {
    currentTokenIndex = 0;
    currentToken = assets[currentTokenIndex];
  }
  currentToken = assets[currentTokenIndex];
}

function prevToken(assets: CoinAssetData[]) {
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
  .text('<', (ctx) => {
    prevToken(ctx.session.assets);

    const newMessage = `Positions Overview:\n\n<b>${currentToken.symbol}</b> | <code>${currentToken.type}</code> | <code>${currentToken.balance}</code>`

    ctx.editMessageText(newMessage, { parse_mode: 'HTML' });
  })
  .text((ctx) => {
    const assets = ctx.session.assets;
    const tokenToUse = currentToken ?? assets[currentTokenIndex];

    return tokenToUse.symbol ?? tokenToUse.type;
  })
  .text(
    '>',
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
  });

export default positions_menu;
