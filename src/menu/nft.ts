import { Menu } from "@grammyjs/menu";
import { home } from "../chains/sui.functions";
import { BotContext } from "../types";

export const nftMenu = new Menu<BotContext>("nft-menu")
  .text("View my collection", async (ctx) => {
    await ctx.reply(
      "This feature will be implemented soon, please follow <a href='https://twitter.com/aldrin_labs'>" +
        "@aldrin_labs</a> to stay tuned.",
      { parse_mode: "HTML", link_preview_options: { is_disabled: true }, reply_markup: nftExitMenu },
    );
    return;
  })
  .row()
  .text("Buy NFT", async (ctx) => {
    await ctx.reply(
      "This feature will be implemented soon, please follow <a href='https://twitter.com/aldrin_labs'>" +
        "@aldrin_labs</a> to stay tuned.",
      { parse_mode: "HTML", link_preview_options: { is_disabled: true }, reply_markup: nftExitMenu },
    );
    return;
  })
  .text("Sell NFT", async (ctx) => {
    await ctx.reply(
      "This feature will be implemented soon, please follow <a href='https://twitter.com/aldrin_labs'>" +
        "@aldrin_labs</a> to stay tuned.",
      { parse_mode: "HTML", link_preview_options: { is_disabled: true }, reply_markup: nftExitMenu },
    );
    return;
  })
  .row()
  .text("Sweep collection", async (ctx) => {
    await ctx.reply(
      "This feature will be implemented soon, please follow <a href='https://twitter.com/aldrin_labs'>" +
        "@aldrin_labs</a> to stay tuned.",
      { parse_mode: "HTML", link_preview_options: { is_disabled: true }, reply_markup: nftExitMenu },
    );
    return;
  })
  .text("Snipe NFT", async (ctx) => {
    await ctx.reply(
      "This feature will be implemented soon, please follow <a href='https://twitter.com/aldrin_labs'>" +
        "@aldrin_labs</a> to stay tuned.",
      { parse_mode: "HTML", link_preview_options: { is_disabled: true }, reply_markup: nftExitMenu },
    );
    return;
  })
  .row()
  .text("Home", async (ctx) => {
    await ctx.conversation.exit();
    ctx.session.step = "main";
    ctx.menu.close();
    await home(ctx);
    return;
  });

export const nftExitMenu = new Menu<BotContext>("nft-exit-menu").back("Home", async (ctx) => {
  await ctx.conversation.exit();
  ctx.session.step = "main";
  ctx.menu.close();
  await home(ctx);
});
