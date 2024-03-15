import { Menu } from "@grammyjs/menu";
import { home } from "../chains/sui.functions";
import { BotContext } from "../types";
import { RINCEL_COIN_TYPE } from "../chains/sui.config";
import { ConversationId } from "../chains/conversations.config";

const feesMenu = new Menu<BotContext>("fees")
  .text("Buy RINCEL", async (ctx) => {
    ctx.session.tradeCoin.coinType = RINCEL_COIN_TYPE;
    ctx.session.tradeCoin.useSpecifiedCoin = true;

    await ctx.conversation.enter(ConversationId.Buy);
  })
  .row()
  .text("Home", async (ctx) => {
    await home(ctx);
  });

export default feesMenu;
