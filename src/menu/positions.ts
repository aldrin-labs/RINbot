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
    await home(ctx);
  })
  .row()
  .text((ctx) => {
    const userBalance = ctx.session.suiAsset.balance;
    return `Buy ${(parseFloat(userBalance) * 0.25).toPrecision(2)} SUI`;
  }, async (ctx) => {
    const assets = ctx.session.assets;
    const userBalance = ctx.session.suiAsset.balance;
    const amount = parseFloat(userBalance) * 0.25;
    const tokenToUse = currentToken ?? assets[currentTokenIndex];
    ctx.session.tradeCoin.coinType = tokenToUse.type;
    ctx.session.tradeAmount = amount.toString();
    ctx.session.tradeCoin.useSpecifiedCoin = true;
    await ctx.conversation.enter(ConversationId.InstantBuy);
  })
  .text((ctx) => {
    const userBalance = ctx.session.suiAsset.balance;
    return `Buy ${(parseFloat(userBalance) * 0.5).toPrecision(2)} SUI`;
  }, async (ctx) => {
    const assets = ctx.session.assets;
    const userBalance = ctx.session.suiAsset.balance;
    const amount = parseFloat(userBalance) * 0.5;
    const tokenToUse = currentToken ?? assets[currentTokenIndex];
    ctx.session.tradeCoin.coinType = tokenToUse.type;
    ctx.session.tradeAmount = amount.toString();
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
    const assets = ctx.session.assets;
    const tokenToUse = currentToken ?? assets[currentTokenIndex];
    ctx.session.tradeCoin.coinType = tokenToUse.type;
    ctx.session.tradeAmount = '25';
    ctx.session.tradeCoin.useSpecifiedCoin = true;
    await ctx.conversation.enter(ConversationId.Sell);
  })
  .text('Sell 100%', async (ctx) => {
    const assets = ctx.session.assets;
    const tokenToUse = currentToken ?? assets[currentTokenIndex];
    ctx.session.tradeCoin.coinType = tokenToUse.type;
    ctx.session.tradeAmount = '100';
    ctx.session.tradeCoin.useSpecifiedCoin = true;
    await ctx.conversation.enter(ConversationId.Sell);
  })
  .text('Sell X%', async (ctx) => {
    const assets = ctx.session.assets;
    const tokenToUse = currentToken ?? assets[currentTokenIndex];
    ctx.session.tradeCoin.coinType = tokenToUse.type;
    ctx.session.tradeAmount = '0';
    ctx.session.tradeCoin.useSpecifiedCoin = true;
    await ctx.conversation.enter(ConversationId.Sell);
  })
  .row()
  .dynamic(async (ctx, range) => {
    const assets = ctx.session.assets;
    const tokenToUse = currentToken ?? assets[currentTokenIndex];
    const [tokenContract] = tokenToUse.type.split('::');
    range.url('SUIVision.xyz', `https://suivision.xyz/package/${tokenContract}`);
  })
  .dynamic(async (ctx, range) => {
    const assets = ctx.session.assets;
    const tokenToUse = currentToken ?? assets[currentTokenIndex];
    range.url('SUIScan.xyz', `https://suiscan.xyz/coin/${tokenToUse.type}`);
  })
  .row()
  .text('Refresh', async (ctx) => {
    await home(ctx);
  });

export default positions_menu;
