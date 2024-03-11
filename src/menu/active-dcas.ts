import { Menu } from '@grammyjs/menu';
import { ConversationId } from '../chains/conversations.config';
import { getDcaInfoString } from '../chains/dca/showActiveDCAs';
import { home } from '../chains/sui.functions';
import { BotContext } from '../types';

/**
 * Steps:
 * +++ 1. Handlecase when there is only 1 dca
 * +++ 2. Add message edit to print only 1 dca when `<` or `>` button is pressed
 * +- 3. Create `Show All` button which appears only after switch-button is clicked once
 * +++ 3. Create buttons `Deposit Base`, `Increase Orders`, `Withdraw Base (and remove orders)` and enter conversations
 *        with corresponding DCA (selected before on menu)
 * 4. Implement conversations for buttons above
 */

const activeDcas = new Menu<BotContext>('active-dcas')
  .dynamic((ctx, range) => {
    const currentIndex = ctx.session.dcas.currentIndex;

    if (currentIndex !== null) {
      range.text('Show All', async (ctx) => {
        const { objects } = ctx.session.dcas;

        let infoString = '<b>Active DCAs:</b>';
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
  // TODO: replace `Base` with baseCoinSymbol
  .text('Withdraw Base')
  .row()
  .text(
    (ctx) => {
      const { currentIndex, objects } = ctx.session.dcas;
      const currentDca = objects[currentIndex ?? 0];
      const baseCoinSymbol = currentDca.fields.base_coin_symbol;

      return `Deposit ${baseCoinSymbol}`;
    },
    async (ctx) => {
      await ctx.conversation.enter(ConversationId.DepositDcaBase);
    },
  )
  .text('Increase Orders')
  .row()
  .text('<', async (ctx) => {
    const { currentIndex, objects } = ctx.session.dcas;

    if (objects.length !== 1) {
      const prevIndex = (currentIndex ?? 0) - 1;

      ctx.session.dcas.currentIndex =
        prevIndex < 0 ? objects.length - 1 : prevIndex;

      const currentDca = objects[ctx.session.dcas.currentIndex];
      const dcaInfoString = getDcaInfoString(currentDca);

      await ctx.editMessageText(dcaInfoString, { parse_mode: 'HTML' });
    }
  })
  .text((ctx) => {
    const { currentIndex, objects } = ctx.session.dcas;
    const currentDca = objects[currentIndex ?? 0];
    const baseCoinSymbol = currentDca.fields.base_coin_symbol;
    const quoteCoinSymbol = currentDca.fields.quote_coin_symbol;
    const dcaNumber = (currentIndex ?? 0) + 1;
    const dcasCount = objects.length;
    const currentDcaName = `${baseCoinSymbol}/${quoteCoinSymbol} (#${dcaNumber}/${dcasCount})`;

    return currentDcaName;
  })
  .text('>', async (ctx) => {
    const { currentIndex, objects } = ctx.session.dcas;

    if (objects.length !== 1) {
      const nextIndex = (currentIndex ?? 0) + 1;

      ctx.session.dcas.currentIndex =
        nextIndex === objects.length ? 0 : nextIndex;

      const currentDca = objects[ctx.session.dcas.currentIndex];
      const dcaInfoString = getDcaInfoString(currentDca);

      await ctx.editMessageText(dcaInfoString, { parse_mode: 'HTML' });
    }
  })
  .row()
  .text('Home', async (ctx) => {
    await home(ctx);
    await ctx.answerCallbackQuery();
  });

export default activeDcas;
