import { CoinAssetData } from '@avernikoz/rinbot-sui-sdk';
import { Menu } from '@grammyjs/menu';
import { home } from '../chains/sui.functions';
import { BotContext } from '../types';
import { ConversationId } from '../chains/conversations.config';

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
  .text('Home', async (ctx) => {
    await home(ctx);
  })
  .text('Close', async (ctx) => {
    ctx.session.step = "main"
  })
  .row()
  .text('Buy 10 SUI', async (ctx) => {
    const assets = ctx.session.assets;
    const tokenToUse = currentToken ?? assets[currentTokenIndex];
    ctx.session.tradeCoin.coinType = tokenToUse.type;
    ctx.session.tradeAmount = '10';
    ctx.session.tradeCoin.useSpecifiedCoin = true;
    await ctx.conversation.enter(ConversationId.InstantBuy);
  })
  .text('Buy 50 SUI', async (ctx) => {
    const assets = ctx.session.assets;
    const tokenToUse = currentToken ?? assets[currentTokenIndex];
    ctx.session.tradeCoin.coinType = tokenToUse.type;
    ctx.session.tradeAmount = '50';
    ctx.session.tradeCoin.useSpecifiedCoin = true;
    await ctx.conversation.enter(ConversationId.InstantBuy);    
  })
  .text('Buy X SUI', async (ctx) => {
    const assets = ctx.session.assets;
    const tokenToUse = currentToken ?? assets[currentTokenIndex];
    ctx.session.tradeCoin.coinType = tokenToUse.type;
    ctx.session.tradeCoin.useSpecifiedCoin = true;
    await ctx.conversation.enter(ConversationId.Buy);
  })
  .row()
  .text('<', (ctx) => {
    prevToken(ctx.session.assets);
    const newMessage = currentToken.symbol
      ? `<b>${currentToken.symbol}</b> | <code>${currentToken.type}</code> | <code>${currentToken.balance}</code>`
      : `<code>${currentToken.type}</code> | <code>${currentToken.balance}</code>`;

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
  .text('Sell 25%', async (ctx) => {
    await home(ctx);
  })
  .text('Sell 100%', async (ctx) => {
    await home(ctx);
  })
  .text('Sell X%', async (ctx) => {
    await home(ctx);
  })
  .row()
  .text('SUIVision.xyz', async (ctx) => {
    await home(ctx);
  })
  .text('SUIScan.xyz', async (ctx) => {
    await home(ctx);
  })
  .row()
  .text('Refresh', async (ctx) => {
    await home(ctx);
  });

export default positions_menu;
