import { WalletManagerSingleton } from '@avernikoz/rinbot-sui-sdk';
import yesOrNo from '../../inline-keyboards/yesOrNo';
import { BotContext, MyConversation } from '../../types';
import {
  BOT_PRIVATE_KEY,
  ENABLE_WELCOME_BONUS,
  WELCOME_BONUS_AMOUNT,
  WELCOME_BONUS_MIN_TRADES_LIMIT,
} from '../../config/bot.config';
import { getTransactionFromMethod, signAndExecuteTransaction } from '../conversations.utils';
import { retryAndGoHomeButtonsData } from '../../inline-keyboards/retryConversationButtonsFactory';
import { ConversationId } from '../conversations.config';
import goHome from '../../inline-keyboards/goHome';

export async function welcomeBonusConversation(conversation: MyConversation, ctx: BotContext): Promise<void> {
  const retryButton = retryAndGoHomeButtonsData[ConversationId.WelcomeBonus];
  const caption =
    `To kickstart your journey with us, we're bestowing upon you ${conversation.session.welcomeBonus.amount} SUI ` +
    `to jumpstart your expedition with us. 🚀 \n\n🤔 👀 Here's the twist: After any withdrawal, your balance must ` +
    `remain at least ${conversation.session.welcomeBonus.amount} SUI, and the option to export your private key ` +
    `becomes available only after engaging in at least ${WELCOME_BONUS_MIN_TRADES_LIMIT} trades. But fear not, ` +
    `you're all set to trade, reap profits, and withdraw your gains!\n Are you ready to take on the challenge? \n\n` +
    `🌐 Your journey begins now! Tap 'Yes' and let the trading adventure commence! 🌟`;

  if (!ENABLE_WELCOME_BONUS) return;

  const welcomeBonusInitialMessage = await ctx.replyWithPhoto('https://pbs.twimg.com/media/FttYpSnakAAS51Z.jpg', {
    caption,
    reply_markup: yesOrNo,
  });

  const answerContext = await conversation.waitFor('callback_query:data');
  const answer = answerContext.callbackQuery.data;

  if (answer === 'no') {
    conversation.session.welcomeBonus.isUserAgreeWithBonus = false;
    await answerContext.answerCallbackQuery();
    await ctx.api.deleteMessage(welcomeBonusInitialMessage.chat.id, welcomeBonusInitialMessage.message_id);

    return;
  }

  if (answer !== 'yes') {
    await ctx.reply("Please select either the 'Yes' or 'No' button to proceed with the welcome bonus.");
    await answerContext.answerCallbackQuery();
    await conversation.skip({ drop: true });

    return;
  }

  // We confirm that user agreed with requirements
  conversation.session.welcomeBonus.isUserAgreeWithBonus = true;
  const transaction = await getTransactionFromMethod({
    conversation,
    ctx,
    method: WalletManagerSingleton.getWithdrawSuiTransaction,
    params: {
      amount: WELCOME_BONUS_AMOUNT.toString(),
      address: ctx.session.publicKey, // destination address
    },
  });

  if (transaction === undefined) {
    await ctx.reply('Failed to create transaction for welcome deposit bonus. Please, try again or contact support.', {
      reply_markup: retryButton,
    });

    return;
  }

  const resultOfDepositWelcomeBonus = await signAndExecuteTransaction({
    conversation,
    ctx,
    transaction,
    signerPrivateKey: BOT_PRIVATE_KEY,
  });

  if (resultOfDepositWelcomeBonus.result === 'success' && resultOfDepositWelcomeBonus.digest) {
    await ctx.reply(
      `Depositing welcome bonus successful!\n\nhttps://suiscan.xyz/mainnet/tx/${resultOfDepositWelcomeBonus.digest}`,
      { reply_markup: goHome },
    );

    conversation.session.welcomeBonus.isUserClaimedBonus = true;
    await answerContext.answerCallbackQuery();

    return;
  }

  if (resultOfDepositWelcomeBonus.result === 'failure' && resultOfDepositWelcomeBonus.digest) {
    await ctx.reply(
      `Depositing welcome bonus failed.\n\nhttps://suiscan.xyz/mainnet/tx/${resultOfDepositWelcomeBonus.digest}`,
      { reply_markup: retryButton },
    );
    await answerContext.answerCallbackQuery();

    return;
  }

  await answerContext.answerCallbackQuery();
  await ctx.reply('Transaction sending failed.', { reply_markup: retryButton });
}
