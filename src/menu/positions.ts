import { CoinAssetData } from '@avernikoz/rinbot-sui-sdk';
import { Menu } from '@grammyjs/menu';
import { home, position } from '../chains/sui.functions';
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
    const assets = ctx.session.assets;
    prevToken(assets);
    ctx.editMessageText(
      `<b>${currentToken.symbol}</b> | <code>${currentToken.type}</code> | <code>${currentToken.balance}</code>`,
      { parse_mode: 'HTML' },
    );
  })
  .text((ctx) => {
    const assets = ctx.session.assets;
    return currentToken
      ? currentToken.symbol!
      : assets[currentTokenIndex].symbol!;
  })
  .text(
    '>',
    (ctx) => {
      const assets = ctx.session.assets;
      nextToken(assets);
      ctx.editMessageText(
        `<b>${currentToken.symbol}</b> | <code>${currentToken.type}</code> | <code>${currentToken.balance}</code>`,
        { parse_mode: 'HTML' },
      );
    },
    (ctx) => ctx.menu.update(),
  )
  .row()
  .text('Home', async (ctx) => {
    await home(ctx);
  });

export default positions_menu;
