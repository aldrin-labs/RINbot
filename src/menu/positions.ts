import { BotContext } from '../types';
import { Menu } from '@grammyjs/menu';

//Mock data
import { walletData } from '../mock/walletData';

let currentTokenIndex = 0;
let currentToken = walletData.tokens[currentTokenIndex];

function nextToken() {
  currentTokenIndex++;
  if (currentTokenIndex === walletData.tokens.length) {
    currentTokenIndex = 0;
    currentToken = walletData.tokens[currentTokenIndex];
  }
  currentToken = walletData.tokens[currentTokenIndex];
}

function prevToken() {
  currentTokenIndex--;
  if (currentTokenIndex < 0) {
    currentTokenIndex = walletData.tokens.length - 1;
    currentToken = walletData.tokens[currentTokenIndex];
  }
  currentToken = walletData.tokens[currentTokenIndex];
}

const positions_menu = new Menu<BotContext>('positions-menu')
  .back('Close', (ctx) => {
    ctx.session.step = 'main';
  })
  .row()
  .text('buy X amount', (ctx) => ctx.reply('buy X'))
  .row()
  .text('<', (ctx) => {
    prevToken();
    ctx.editMessageText(`${currentToken.coinName} | ${currentToken.coinTicker} | 
    ${currentToken.coinAddress}
    `);
  })
  .text(() => {
    return currentToken.coinTicker;
  })
  .text(
    '>',
    (ctx) => {
      nextToken();
      ctx.editMessageText(`${currentToken.coinName} | ${currentToken.coinTicker} | 
    ${currentToken.coinAddress}
    `);
    },
    (ctx) => ctx.menu.update(),
  )
  .row()

  .text('sell 25%', (ctx) => ctx.reply('sell 25%'))
  .text('sell 100%', (ctx) => ctx.reply('sell 100%'))
  .text('sell X%', (ctx) => ctx.reply('sell X%'))
  .row()
  //.url('explorer', "https://suiscan.io").url('dexscreener', "https://dexscreener.io").url('scan', '@ttfbotbot').url('chart', '@ttfbotbot').row()
  .text('refresh', (ctx) => ctx.reply('refresh'));

export default positions_menu;
