import { InlineKeyboard } from 'grammy';
import assets from '../../../inline-keyboards/assets';
import closeConversation from '../../../inline-keyboards/closeConversation';
import goHome from '../../../inline-keyboards/goHome';
import refundOptionsKeyboard from '../../../inline-keyboards/refund-options';
import { retryAndGoHomeButtonsData } from '../../../inline-keyboards/retryConversationButtonsFactory';
import { BotContext, MyConversation } from '../../../types';
import { CallbackQueryData } from '../../../types/callback-queries-data';
import { ConversationId } from '../../conversations.config';
import { generateWallet } from '../../sui.functions';
import { warnWithCheckAndPrivateKeyPrinting } from '../../wallet/utils';

export async function makeRefund(
  conversation: MyConversation,
  ctx: BotContext,
) {
  const retryButton = retryAndGoHomeButtonsData[ConversationId.MakeRefund];
  const closeButtons = closeConversation.inline_keyboard[0];
  const optionsWithExportAndCloseKeyboard = refundOptionsKeyboard
    .clone()
    .row()
    .add(...closeButtons);

  const homeButtons = goHome.inline_keyboard[0];
  const assetsWithHomeKeyboard = assets.clone().add(...homeButtons);

  await ctx.reply(
    "✅ Your <b>security</b> and <b>satisfaction</b> are paramount for us, so we're committed to <b>make things " +
      'right for you</b>.\n\n✎ Here are <b>two options</b> for your refund:\n\n' +
      '💵 1. <b>Full Refund</b>: Receive <i><b>100%</b></i> of your lost funds and maintain control. You can still withdraw and ' +
      'export your private key as usual.\n\n' +
      "💸 2. <b>Enhanced Refund</b>: Enjoy <i><b>150%</b></i> of your lost funds. We'll create a new, secure account for you. " +
      'While funds withdrawal and private key export will temporarily be disabled, your funds will be safely usable within our ' +
      'platform for trading and gaining profit, for creating your custom coins and liquidity pools and all other available ' +
      'functionalities.',
    {
      reply_markup: optionsWithExportAndCloseKeyboard,
      parse_mode: 'HTML',
    },
  );

  const choiseContext = await conversation.waitFor('callback_query:data');
  const choiseCallbackQueryData = choiseContext.callbackQuery.data;

  if (choiseCallbackQueryData === CallbackQueryData.Cancel) {
    await conversation.skip();
  } else if (choiseCallbackQueryData === CallbackQueryData.ExportPrivateKey) {
    await conversation.skip();
  } else if (choiseCallbackQueryData === CallbackQueryData.FullRefund) {
    await choiseContext.answerCallbackQuery();
    // TODO: Send transaction to refund user

    // TODO: Modify this message after SDK integration
    await ctx.reply('Funds are successfully sent to your account!', {
      reply_markup: assetsWithHomeKeyboard,
    });

    return;
  } else if (choiseCallbackQueryData === CallbackQueryData.EnhancedRefund) {
    await choiseContext.answerCallbackQuery();

    const warnMessage =
      '✅ Before proceeding with enhanced refund, please be aware that you will need to <i><b>export the private ' +
      'key of your current wallet</b></i>. Pressing the <b>Confirm</b> button will initiate the process of exporting ' +
      'the private key of your current wallet.\n\n⚠️ Enhanced refund <i><b>without exporting the private key</b></i> ' +
      'may result in <i><b>loss of access to your current funds</b></i>.';

    const warnWithCheckAndPrintSucceeded =
      await warnWithCheckAndPrivateKeyPrinting({
        conversation,
        ctx,
        operation: 'enhanced refund',
        retryButton,
        warnMessage,
      });

    if (!warnWithCheckAndPrintSucceeded) {
      return;
    }

    const { publicKey, privateKey } = generateWallet();
    conversation.session.publicKey = publicKey;
    conversation.session.privateKey = privateKey;
    conversation.session.refund.claimedBoostedRefund = true;

    // TODO: Send transaction to refund user 150%

    // TODO: Modify this message after SDK integration
    await ctx.reply(
      'Account is successfully created and funds are successfully sent to it!',
      { reply_markup: assetsWithHomeKeyboard },
    );

    return;
  } else {
    await reactOnUnexpectedBehaviour(choiseContext, retryButton);
    return;
  }
}

async function reactOnUnexpectedBehaviour(
  ctx: BotContext,
  retryButton: InlineKeyboard,
) {
  await ctx.answerCallbackQuery();

  await ctx.reply('You have canceled the refund.', {
    reply_markup: retryButton,
  });
}
