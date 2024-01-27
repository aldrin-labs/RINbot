import {BotContext} from '../types';
import { Menu } from "@grammyjs/menu";


const wallet_menu = new Menu<BotContext>("wallet-menu")
  .text("View in explorer", async (ctx: any) => {
    // open link

    ctx.reply("open link")
  })
  .back("Close", (ctx) => {ctx.session.step = "main"}).row()
  .text("Deposit", (ctx) => {
    ctx.session.step = "wallet-deposit";
    ctx.menu.nav("wallet-deposit-menu");
  })
  .text("Withdraw all", async (ctx: any) => {

    ctx.reply("withdraw all")
  })
  .text("Withdraw X amount", async (ctx: any) => {

    ctx.reply("withdraw x amount")
  }).row()
  .text("Reset wallet", async (ctx: any) => {

    ctx.reply("Reset wallet")
  })
  .text("Export private key", async (ctx: any) => {

    ctx.reply("Export private key")
  }).row();


export default wallet_menu;