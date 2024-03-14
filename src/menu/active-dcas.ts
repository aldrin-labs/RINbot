import { Menu } from '@grammyjs/menu';
import { ConversationId } from '../chains/conversations.config';
import { getDcaInfoString } from '../chains/dca/showActiveDCAs';
import { home } from '../chains/sui.functions';
import { BotContext } from '../types';

const activeDcas = new Menu<BotContext>('active-dcas')
  .dynamic((ctx, range) => {
    const currentIndex = ctx.session.dcas.currentIndex;

    if (currentIndex !== null) {
      range.text('Show All', async (ctx) => {
        const { objects } = ctx.session.dcas;

        let infoString = '📊 <b>Active DCAs</b> 📊';
        let i = 1;
        for (const dca of objects) {
          const dcaDataString = getDcaInfoString(dca, i);
          infoString += dcaDataString;
          i++;
        }

        ctx.session.dcas.currentIndex = null;

        await ctx.editMessageText(infoString, { parse_mode: 'HTML' });
      });
    }
  })
  .text(
    (ctx) => {
      const { currentIndex, objects } = ctx.session.dcas;
      // TODO: Make this more explicit
      const currentDca = objects[currentIndex ?? 0];
      const baseCoinSymbol = currentDca.fields.base_coin_symbol;

      return `Deposit ${baseCoinSymbol}`;
    },
    async (ctx) => {
      await ctx.conversation.enter(ConversationId.DepositDcaBase);
    },
  )
  .row()
  .text(
    (ctx) => {
      const { currentIndex, objects } = ctx.session.dcas;
      // TODO: Make this more explicit
      const currentDca = objects[currentIndex ?? 0];
      const baseCoinSymbol = currentDca.fields.base_coin_symbol;

      return `Withdraw ${baseCoinSymbol}`;
    },
    async (ctx) => {
      await ctx.conversation.enter(ConversationId.WithdrawDcaBase);
    },
  )
  .text('Close DCA', async (ctx) => {
    await ctx.conversation.enter(ConversationId.CloseDca);
  })
  .row()
  .text('Increase Orders Count', async (ctx) => {
    await ctx.conversation.enter(ConversationId.IncreaseDcaOrders);
  })
  .text('Create DCA', async (ctx) => {
    await ctx.conversation.enter(ConversationId.CreateDca);
  })
  .row()
  .text('<', async (ctx) => {
    const { currentIndex, objects } = ctx.session.dcas;

    if (objects.length !== 1) {
      // TODO: Make this more explicit
      const prevIndex = (currentIndex ?? 0) - 1;

      ctx.session.dcas.currentIndex =
        prevIndex < 0 ? objects.length - 1 : prevIndex;

      await editDcaStatsMessage(ctx);
    }
  })
  .text((ctx) => {
    const { currentIndex, objects } = ctx.session.dcas;
    // TODO: Make this more explicit
    const currentDca = objects[currentIndex ?? 0];
    const baseCoinSymbol = currentDca.fields.base_coin_symbol;
    const quoteCoinSymbol = currentDca.fields.quote_coin_symbol;
    // TODO: Make this more explicit
    const dcaNumber = (currentIndex ?? 0) + 1;
    const dcasCount = objects.length;
    const currentDcaName = `${baseCoinSymbol}/${quoteCoinSymbol} (#${dcaNumber}/${dcasCount})`;

    return currentDcaName;
  })
  .text('>', async (ctx) => {
    const { currentIndex, objects } = ctx.session.dcas;

    if (objects.length !== 1) {
      // TODO: Make this more explicit
      const nextIndex = (currentIndex ?? 0) + 1;

      ctx.session.dcas.currentIndex =
        nextIndex === objects.length ? 0 : nextIndex;

      await editDcaStatsMessage(ctx);
    }
  })
  .row()
  .text('Home', async (ctx) => {
    await home(ctx);
    await ctx.answerCallbackQuery();
  });

export default activeDcas;

async function editDcaStatsMessage(ctx: BotContext) {
  const { currentIndex, objects } = ctx.session.dcas;
  // TODO: Make this more explicit
  const index = currentIndex ?? 0;

  const currentDca = objects[index];
  let resultDcaString = '📊 <b>DCA Stats</b> 📊';
  const dcaInfoString = getDcaInfoString(currentDca, index + 1);

  resultDcaString += dcaInfoString;

  await ctx.editMessageText(resultDcaString, { parse_mode: 'HTML' });
}
