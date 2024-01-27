
import { Router } from "@grammyjs/router";
import { BotContext, SessionData } from '../types';

import { SuiApi } from "../chains/sui";

import add_positions_route from './positions';

const buy_text = "Buy Token: \n\nTo buy a token enter a token address";


export default () => {
    let router = new Router<BotContext>((ctx) => ctx.session.step);


    const buy_route = router.route("buy");
    buy_route.on("message:text", async (ctx) => {
    const message = ctx.message; // the message object
        console.log("BUY THIS TOKEN ---- ", message);
        await ctx.reply(buy_text);
    });
    // buy_route.use(async (ctx) => 
    // {
    //     console.log('USE BUY ROUTER!@!@!@!@!');
    //     await ctx.reply(buy_text);
    // });

    router = add_positions_route(router);

    const wallet_deposit_route = router.route("wallet-deposit");
    wallet_deposit_route.on("message:text", async (ctx) => {
    const message = ctx.message; // the message object
        console.log("DEPOSIT THIS TOKEN ---- ", message);
        await ctx.reply("DEPOSIT WALLET");
    });
    return router;
}