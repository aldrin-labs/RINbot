import { MiddlewareFn } from 'grammy';
import { BotContext } from '../types';
import { accountIsNotInitialized } from '../chains/utils';
import { ConversationId } from '../chains/conversations.config';

export const checkAccountMiddleware: MiddlewareFn<BotContext> = async (ctx, next) => {
  if (accountIsNotInitialized(ctx)) {
    await ctx.reply(
      '<b>Welcome to RINbot on Sui Network!</b>\n\n' +
        "We are using <i><b>Account Abstraction</b></i> to keep your money in safe, so you don't have to import " +
        'your wallet.\n\nBelow, you will specify a single address that <i><b>cannot be changed in the ' +
        'future</b></i> ' +
        'and to which your account will be able to withdraw funds. <b>Funds cannot be transferred to any other ' +
        'address</b>.\n\nThis means that in case of any data leakage, hacking or other scenarios of malicious ' +
        'behavior, your funds can only be withdrawn to the address that you will specify now.',
      { parse_mode: 'HTML' },
    );

    await ctx.conversation.enter(ConversationId.InitializeAccount);
  } else {
    await next();
  }
};
