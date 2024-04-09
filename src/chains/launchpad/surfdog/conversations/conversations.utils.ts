import { SurfdogLaunchpadSingleton } from '@avernikoz/rinbot-sui-sdk';
import { BotContext, MyConversation } from '../../../../types';
import { getTransactionForStructuredResult, signAndExecuteTransaction } from '../../../conversations.utils';
import { InlineKeyboard } from 'grammy';

export async function createUserState({
  ctx,
  conversation,
  surfdog,
  retryButton,
}: {
  ctx: BotContext;
  conversation: MyConversation;
  surfdog: SurfdogLaunchpadSingleton;
  retryButton: InlineKeyboard;
}) {
  await ctx.reply('Preparing account to buy tickets...');

  const createUserStateTransaction = await getTransactionForStructuredResult({
    conversation,
    ctx,
    method: surfdog.createUserState.bind(surfdog) as typeof surfdog.createUserState,
    params: undefined,
  });

  if (createUserStateTransaction === undefined) {
    await ctx.reply('Failed to create transaction for user state creation. Please, try again or contact support.', {
      reply_markup: retryButton,
    });

    return;
  }

  await signAndExecuteTransaction({
    conversation,
    ctx,
    transaction: createUserStateTransaction,
  });
}
