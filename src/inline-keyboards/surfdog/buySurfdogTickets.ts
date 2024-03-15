import { InlineKeyboard } from "grammy";
import surfdogHomeKeyboard from "./surfdogHome";

const buySurfdogTicketsKeyboard = new InlineKeyboard()
  .text("Buy More Tickets", "buy-more-surfdog-tickets")
  .text("Your Tickets", "user-surfdog-tickets")
  .row()
  .add(...surfdogHomeKeyboard.inline_keyboard[0]);

export default buySurfdogTicketsKeyboard;
