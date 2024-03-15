import { SUI_DECIMALS, SurfdogLaunchpadSingleton } from "@avernikoz/rinbot-sui-sdk";
import BigNumber from "bignumber.js";
import confirm from "../../../../inline-keyboards/confirm";
import { retryAndGoHomeButtonsData } from "../../../../inline-keyboards/retryConversationButtonsFactory";
import buySurfdogTicketsKeyboard from "../../../../inline-keyboards/surfdog/buySurfdogTickets";
import closeSurfdogConversation from "../../../../inline-keyboards/surfdog/closeSurfdogConversation";
import { BotContext, MyConversation } from "../../../../types";
import {
  getTransactionForStructuredResult,
  signAndExecuteTransactionAndReturnResult,
} from "../../../conversations.utils";
import { getWalletManager } from "../../../sui.functions";
import { sleep } from "../../../utils";
import { getSurfdogLaunchpad } from "../getSurfdogLaunchpad";
import { convertBigIntToString } from "../utils/convertBigIntToString";
import { waitForTicketResult } from "../utils/waitForTicketResult";
import { MAX_TICKETS_TO_BUY, SurfdogConversationId } from "./conversations.config";
import { createUserState } from "./conversations.utils";

export async function buySurfdogTickets(conversation: MyConversation, ctx: BotContext) {
  const surfdog = getSurfdogLaunchpad();
  const retryButton = retryAndGoHomeButtonsData[SurfdogConversationId.BuySurfdogTickets];

  const ticketPriceMessage = await ctx.reply("Checking ticket price...");

  const globalState = await conversation.external(async () => {
    const gameState = await surfdog.getGameState();

    // Need to convert all the fields from `bigint` to `string`, because `external` doesn't know, how to
    // stringify `bigint`s
    return convertBigIntToString(gameState);
  });
  const ticketPriceInSui = new BigNumber(globalState.ticketPrice.toString()).dividedBy(10 ** SUI_DECIMALS).toString();

  await ctx.api.editMessageText(
    ticketPriceMessage.chat.id,
    ticketPriceMessage.message_id,
    `<b>Info</b>: 1 ticket = ${ticketPriceInSui} SUI`,
    {
      parse_mode: "HTML",
    },
  );

  const lookingMessage = await ctx.reply("Looking at your <b>SUI</b> balance...", { parse_mode: "HTML" });

  const suiBalance = await conversation.external(async () => {
    const walletManager = await getWalletManager();
    // TODO: Maybe we should add try/catch here as well
    const balance = await walletManager.getSuiBalance(ctx.session.publicKey);

    return balance;
  });
  const maxTicketsCount = Math.min(surfdog.getMaxTicketsCount(suiBalance, ticketPriceInSui), MAX_TICKETS_TO_BUY);
  const ticketPriceWithGasBudget = new BigNumber(SurfdogLaunchpadSingleton.GAS_BUDGET_FOR_BUYING_TICKET)
    .dividedBy(10 ** SUI_DECIMALS)
    .plus(ticketPriceInSui)
    .toString();

  if (maxTicketsCount < 1) {
    await ctx.api.editMessageText(
      lookingMessage.chat.id,
      lookingMessage.message_id,
      `Your <b>SUI</b> balance is <b>${suiBalance} SUI</b>. You need at least <b>${ticketPriceWithGasBudget} ` +
        `SUI</b> to buy 1 ticket.\n\nPlease, top up your <b>SUI</b> balance.`,
      { reply_markup: retryButton, parse_mode: "HTML" },
    );

    return;
  }

  await ctx.api.editMessageText(
    lookingMessage.chat.id,
    lookingMessage.message_id,
    `How much tickets do you want to buy (<code>1</code> - <code>${maxTicketsCount}</code>)?`,
    { reply_markup: closeSurfdogConversation, parse_mode: "HTML" },
  );

  const amountContext = await conversation.wait();
  const amountCallbackQueryData = amountContext.callbackQuery?.data;
  const amountMessage = amountContext.msg?.text;
  let ticketsCount: string | undefined;

  if (amountCallbackQueryData === "close-surfdog-conversation") {
    await conversation.skip();
  }
  if (amountMessage !== undefined) {
    const amountInt = parseInt(amountMessage);

    if (isNaN(amountInt)) {
      await ctx.reply("Tickets count must be an integer. Please, try again.", {
        reply_markup: closeSurfdogConversation,
      });

      await conversation.skip({ drop: true });
    }

    const amountIsValid = amountInt >= +ticketPriceInSui && amountInt <= maxTicketsCount;

    if (!amountIsValid) {
      await ctx.reply(
        `<b>Tickets count</b> must be at least <code>1</code>. Maximum available <b>tickets count</b> ` +
          `to buy is <code>${maxTicketsCount}</code>.\n\nPlease, try again.`,
        { reply_markup: closeSurfdogConversation, parse_mode: "HTML" },
      );

      await conversation.skip({ drop: true });
    }

    ticketsCount = amountInt.toString();
  } else {
    await ctx.reply("Please, enter the tickets amount you want to buy.", {
      reply_markup: closeSurfdogConversation,
    });

    await conversation.skip({ drop: true });
  }

  if (ticketsCount === undefined) {
    await ctx.reply("Cannot process tickets amount. Please, try again or contact support.", {
      reply_markup: retryButton,
    });

    return;
  }

  const closeButtons = closeSurfdogConversation.inline_keyboard[0];
  const confirmWithCloseKeyboard = confirm.clone().add(...closeButtons);

  await ctx.reply(`You are going to buy <b>${ticketsCount} ticket(s)</b>.`, {
    reply_markup: confirmWithCloseKeyboard,
    parse_mode: "HTML",
  });

  const confirmContext = await conversation.waitFor("callback_query:data");
  const confirmCallbackQueryData = confirmContext.callbackQuery.data;

  if (confirmCallbackQueryData === "close-surfdog-conversation") {
    await conversation.skip();
  }
  if (confirmCallbackQueryData !== "confirm") {
    await ctx.reply("Please, choose the button.", {
      reply_markup: closeSurfdogConversation,
    });

    await confirmContext.answerCallbackQuery();
    await conversation.skip({ drop: true });
  }
  await confirmContext.answerCallbackQuery();

  await ctx.reply("Checking your account is ready to buy tickets...");

  let userState = await conversation.external(() => surfdog.getUserState(ctx.session.publicKey));

  if (userState === null) {
    await createUserState({ ctx, conversation, surfdog, retryButton });

    userState = await conversation.external(() => surfdog.getUserState(ctx.session.publicKey));

    if (userState === null) {
      await ctx.reply("Cannot create user state. Please, try again or contact support.", { reply_markup: retryButton });

      return;
    }
  }

  await ctx.reply("Account is ready to buy tickets, let's go!");

  const ticketPrice = globalState.ticketPrice.toString();

  let succededTransactionsCount = 0;
  const ticketsCountInt = +ticketsCount;

  while (succededTransactionsCount < ticketsCountInt) {
    const buyTicketTransaction = await getTransactionForStructuredResult({
      conversation,
      ctx,
      method: surfdog.buyTicket.bind(surfdog) as typeof surfdog.buyTicket,
      params: { ticketPrice, userStateId: userState.id },
    });

    if (buyTicketTransaction === undefined) {
      await ctx.reply("Failed to create transaction for ticket buying. Trying again...", {
        reply_markup: closeSurfdogConversation,
      });

      continue;
    }

    await ctx.reply("Buying ticket and spinning...");

    const buyTicketResult = await signAndExecuteTransactionAndReturnResult({
      conversation,
      ctx,
      transaction: buyTicketTransaction,
    });

    if (buyTicketResult.resultStatus === "success" && buyTicketResult.transactionResult && buyTicketResult.digest) {
      const userHasWon = surfdog.checkSpinStatusByTx({
        tx: buyTicketResult.transactionResult,
      });

      if (userHasWon) {
        await waitForTicketResult(ctx);
        await ctx.reply("<b>You've WON!</b>", { parse_mode: "HTML" });
        await sleep(300);
      } else {
        await waitForTicketResult(ctx);
        await ctx.reply("<b>You've LOST.</b>", { parse_mode: "HTML" });
        await sleep(300);
      }

      succededTransactionsCount++;

      continue;
    }

    console.warn("Failed signAndExecuteTransaction for ticket buying:", buyTicketResult);

    await ctx.reply("Failed to buy ticket. Please, try again or contact support.", {
      reply_markup: retryButton,
    });

    return;
  }

  await ctx.reply("All your tickets have been used.", {
    reply_markup: buySurfdogTicketsKeyboard,
  });

  return;
}
