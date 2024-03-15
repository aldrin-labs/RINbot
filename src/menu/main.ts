import { Menu, MenuRange } from "@grammyjs/menu";
import { ConversationId } from "../chains/conversations.config";
import { showFeesPage } from "../chains/fees/showFeesPage";
import { showSlippageConfiguration } from "../chains/slippage/showSlippageConfiguration";
import { assets, nftHome } from "../chains/sui.functions";
import { ENABLE_WELCOME_BONUS } from "../config/bot.config";
import goHome from "../inline-keyboards/goHome";
import { BotContext } from "../types";
import alertsMenu from "./alerts";
import buyMenu from "./buy";
import feesMenu from "./fees";
import helpMenu from "./help";
import launchpadMenu from "./launchpad/launchpad";
import { nftExitMenu, nftMenu } from "./nft";
import poolsMenu from "./pools";
import positionsMenu from "./positions";
import referMenu from "./refer";
import settingsMenu from "./settings";
import walletMenu from "./wallet";
import depositMenu from "./wallet_deposit";
import withdrawMenu from "./wallet_withdraw";
import { userAgreement } from "../home/user-agreement";

const menu = new Menu<BotContext>("main")
  .text("Buy", async (ctx) => {
    ctx.session.step = "buy";
    await ctx.conversation.enter("buy");
  })
  .text("Sell & Manage", async (ctx) => {
    ctx.session.step = "positions";
    await assets(ctx);
  })
  .row()
  .text("Manage NFTs", async (ctx) => {
    ctx.session.step = "nft-menu";
    await nftHome(ctx);
  })
  .text("Wallet", async (ctx) => {
    ctx.session.step = "wallet";
    ctx.menu.nav("wallet-menu");
  })
  .row()
  .text("Pools", async (ctx) => {
    ctx.menu.nav("sui-pools");
  })
  .text("Create Coin", async (ctx) => {
    await ctx.conversation.enter("createCoin");
  })
  .row()
  .text("Launchpad", (ctx) => {
    ctx.menu.nav("launchpad");
  })
  .text("Slippage", async (ctx) => {
    await showSlippageConfiguration(ctx);
  })
  .row()
  .text("User Agreement", async (ctx) => {
    await ctx.reply(userAgreement, { parse_mode: "HTML", reply_markup: goHome });
  })
  // .row()
  // .text('Aldrin Bridge')
  .text("Fees", async (ctx) => {
    await showFeesPage(ctx);
  })
  .row()
  .url("Buy $RIN token", "https://jup.ag/swap/USDC-RIN")
  .dynamic((ctx: BotContext, range: MenuRange<BotContext>) => {
    const { isUserEligibleToGetBonus, isUserAgreeWithBonus, isUserClaimedBonus } = ctx.session.welcomeBonus;

    if (
      isUserEligibleToGetBonus &&
      !isUserClaimedBonus &&
      (isUserAgreeWithBonus === null || isUserAgreeWithBonus === true)
    ) {
      if (ENABLE_WELCOME_BONUS)
        range.row().text("Claim Free SUI", async (ctx: BotContext) => {
          await ctx.conversation.enter(ConversationId.WelcomeBonus);
        });
    }
  });

menu.register(buyMenu);
menu.register(nftMenu);
menu.register(nftExitMenu);
menu.register(positionsMenu);
menu.register(helpMenu);
menu.register(referMenu);
menu.register(alertsMenu);
menu.register(walletMenu);
menu.register(settingsMenu);
menu.register(depositMenu, "wallet-menu");
menu.register(withdrawMenu, "wallet-menu");
menu.register(poolsMenu);
menu.register(launchpadMenu);
menu.register(feesMenu);

export default menu;
