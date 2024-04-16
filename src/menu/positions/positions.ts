import { Menu } from '@grammyjs/menu';
import { home } from '../../chains/sui.functions';
import { BotContext } from '../../types';
import { buyFromPositionsMenu, refreshCurrentAsset, sellFromPositionsMenu, updateCurrentToken } from './utils';

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
      await buyFromPositionsMenu({ absoluteAmountPercentage: 0.25, ctx });
    },
  )
  .text(
    (ctx) => {
      const userBalance = ctx.session.suiAsset.balance;
      return `Buy ${(parseFloat(userBalance) * 0.5).toPrecision(2)} SUI`;
    },
    async (ctx) => {
      await buyFromPositionsMenu({ absoluteAmountPercentage: 0.5, ctx });
    },
  )
  .text('Buy X SUI', async (ctx) => {
    await buyFromPositionsMenu({ ctx });
  })
  .row()
  .dynamic(async (ctx, range) => {
    const { data } = ctx.session.assets;

    if (data.length > 1) {
      range
        .text('⬅️', async (ctx) => {
          await updateCurrentToken(ctx, 'prev');
        })
        .text(async (ctx) => {
          const { data, currentIndex } = ctx.session.assets;
          const tokenToUse = data[currentIndex];

          return tokenToUse.symbol ?? tokenToUse.type;
        })
        .text('➡️', async (ctx) => {
          await updateCurrentToken(ctx, 'next');
        });
    }
  })
  .row()
  .text('Sell 25%', async (ctx) => {
    await sellFromPositionsMenu({ ctx, sellPercentage: '25' });
  })
  .text('Sell 100%', async (ctx) => {
    await sellFromPositionsMenu({ ctx, sellPercentage: '100' });
  })
  .text('Sell X%', async (ctx) => {
    await sellFromPositionsMenu({ ctx });
  })
  .row()
  .dynamic(async (ctx, range) => {
    const { currentIndex, data } = ctx.session.assets;
    const tokenToUse = data[currentIndex];
    range.url('SUIScan.xyz', `https://suiscan.xyz/coin/${tokenToUse.type}`);
  })
  .row()
  .text('Refresh', async (ctx) => {
    await refreshCurrentAsset(ctx);
  });

export default positionsMenu;
