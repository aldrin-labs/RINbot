import {BotContext} from '../types';
import { Menu } from "@grammyjs/menu";
import { SuiApi } from '../chains/sui';

const wallet_menu = new Menu<BotContext>("wallet-menu")
  .dynamic((ctx, range) => {
      range.url("View in explorer", SuiApi.getExplorerLink(ctx))
  })    
  .back("Close", (ctx) => {ctx.session.step = "main"}).row()
  .text("Deposit", (ctx) => {
    ctx.reply(`Your public key is: <code>${ctx.session.publicKey}</code>`, { parse_mode: "HTML" });
  })
  .text("Withdraw X amount", async (ctx: any) => {
    ctx.session.step = "wallet-withdraw";
    ctx.menu.nav("wallet-withdraw-menu");
    ctx.conversation.enter("withdraw");
    //ctx.reply("withdraw x amount")
  }).row()
//   .text("Reset wallet", async (ctx: any) => {

//     ctx.reply("Reset wallet")
//   })
  .text("Export private key", async (ctx: any) => {

    ctx.reply(`Your private key: ${ctx.session.privateKey} \n !!!Please delete message after you save it!!!`)
  }).row();


export default wallet_menu;