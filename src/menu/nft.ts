import { Menu } from '@grammyjs/menu';
import { home } from '../chains/sui.functions';
import { BotContext } from '../types';

export const nft_menu = new Menu<BotContext>('nft-menu')
  .text('View my collection', async (ctx) => {
    await ctx.reply(
      'This feature will be implemented soon, please follow <a href="https://twitter.com/aldrin_labs">@aldrin_labs</a> to stay tunes',
      {
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true },
        reply_markup: nft_exit_menu,
      },
    );
    return;
  })
  .row()
  .text('Buy NFT', async (ctx) => {
    await ctx.reply(
      'This feature will be implemented soon, please follow <a href="https://twitter.com/aldrin_labs">@aldrin_labs</a> to stay tunes',
      {
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true },
        reply_markup: nft_exit_menu,
      },
    );
    return;
  })
  .text('Sell NFT', async (ctx) => {
    await ctx.reply(
      'This feature will be implemented soon, please follow <a href="https://twitter.com/aldrin_labs">@aldrin_labs</a> to stay tunes',
      {
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true },
        reply_markup: nft_exit_menu,
      },
    );
    return;
  })
  .row()
  .text('Sweep collection', async (ctx) => {
    await ctx.reply(
      'This feature will be implemented soon, please follow <a href="https://twitter.com/aldrin_labs">@aldrin_labs</a> to stay tunes',
      {
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true },
        reply_markup: nft_exit_menu,
      },
    );
    return;
  })
  .text('Snipe NFT', async (ctx) => {
    await ctx.reply(
      'This feature will be implemented soon, please follow <a href="https://twitter.com/aldrin_labs">@aldrin_labs</a> to stay tunes',
      {
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true },
        reply_markup: nft_exit_menu,
      },
    );
    return;
  })
  .row()
  .text('Home', async (ctx) => {
    await ctx.conversation.exit();
    ctx.menu.close();
    await home(ctx);
    return;
  });

export const nft_exit_menu = new Menu<BotContext>('nft-exit-menu').back('Home', async (ctx) => {
  await ctx.conversation.exit();
  ctx.menu.close();
  await home(ctx);
});
