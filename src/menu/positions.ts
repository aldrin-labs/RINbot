import { BotContext } from '../types';
import { Menu } from '@grammyjs/menu';
import { CoinAssetData } from '@avernikoz/rinbot-sui-sdk';

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
  .back('Close', (ctx) => {
    ctx.session.step = 'main';
  })
  // .row()
  // .text('buy X amount', (ctx) => ctx.reply('buy X'))
  .row()
  .text('<', (ctx) => {
    const assets = ctx.session.assets;
    prevToken(assets);
    ctx.editMessageText(
      `${currentToken.symbol} | ${currentToken.type} | ${currentToken.balance}`,
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
        `${currentToken.symbol} | ${currentToken.type} | ${currentToken.balance}`,
      );
    },
    (ctx) => ctx.menu.update(),
  )
  // .row()

  // .text('sell 25%', (ctx) => ctx.reply('sell 25%'))
  // .text('sell 100%', (ctx) => ctx.reply('sell 100%'))
  // .text('sell X%', (ctx) => ctx.reply('sell X%'))
  .text('sell X', async (ctx) => {
    ctx.session.step = 'sell';
    await ctx.conversation.enter('sell');
  })
  .row();
//.url('explorer', "https://suiscan.io").url('dexscreener', "https://dexscreener.io").url('scan', '@ttfbotbot').url('chart', '@ttfbotbot').row()
// .text('Refresh', (ctx) => ctx.reply('refresh'));

export default positions_menu;
