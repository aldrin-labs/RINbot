import {
  RefundManagerSingleton,
  isValidSuiAddress,
} from '@avernikoz/rinbot-sui-sdk';
import BigNumber from 'bignumber.js';
import { ALDRIN_AUTHORITY } from '../../../config/bot.config';
import closeConversation from '../../../inline-keyboards/closeConversation';
import goHome from '../../../inline-keyboards/goHome';
import importWalletWithContinueKeyboard from '../../../inline-keyboards/mixed/import-wallet-with-continue';
import refundsKeyboard from '../../../inline-keyboards/refunds';
import { retryAndGoHomeButtonsData } from '../../../inline-keyboards/retryConversationButtonsFactory';
import { BotContext, MyConversation } from '../../../types';
import { CallbackQueryData } from '../../../types/callback-queries-data';
import { ConversationId } from '../../conversations.config';
import {
  getTransactionFromMethod,
  signAndExecuteTransaction,
} from '../../conversations.utils';
import { TransactionResultStatus } from '../../sui.functions';
import {
  getSuiVisionTransactionLink,
  reactOnUnexpectedBehaviour,
} from '../../utils';
import { importNewWallet } from '../../wallet/conversations/import';
import { warnWithCheckAndPrivateKeyPrinting } from '../../wallet/utils';
import { getRefundManager } from '../getRefundManager';
import { userHasBoostedRefundAccount } from '../utils';
import {
  BOOSTED_REFUND_EXAMPLE_FOR_USER_URL,
  boostedRefundExportPrivateKeyWarnMessage,
} from './config';

export async function checkProvidedAddress(
  conversation: MyConversation,
  ctx: BotContext,
) {
  const refundManager = getRefundManager();
  const retryButton =
    retryAndGoHomeButtonsData[ConversationId.CheckProvidedAddressForRefund];

  // Ask user for address he wants to check
  await ctx.reply('Please, enter the <b>public key</b> you want to check.', {
    reply_markup: closeConversation,
    parse_mode: 'HTML',
  });

  const affectedPublicKeyContext = await conversation.wait();
  const affectedPublicKeyCallbackQueryData =
    affectedPublicKeyContext.callbackQuery?.data;
  const affectedPublicKey = affectedPublicKeyContext.msg?.text;

  if (affectedPublicKeyCallbackQueryData === CallbackQueryData.Cancel) {
    await conversation.skip();
  } else if (affectedPublicKey !== undefined) {
    const publicKeyIsValid = isValidSuiAddress(affectedPublicKey);

    if (!publicKeyIsValid) {
      await ctx.reply(
        'Entered <b>public key</b> is not valid. Please, enter a valid one.',
        { reply_markup: closeConversation, parse_mode: 'HTML' },
      );

      await conversation.skip({ drop: true });
    }
  } else {
    await reactOnUnexpectedBehaviour(
      ctx,
      retryButton,
      'provided address check',
    );
    return;
  }

  if (affectedPublicKey === undefined) {
    await ctx.reply(
      'Cannot process provided public key. Please, try again or contact support.',
      { reply_markup: retryButton },
    );

    return;
  }

  const checkingMessage = await ctx.reply(
    '<b>Checking this account, it may take some time....</b>',
    {
      parse_mode: 'HTML',
    },
  );

  // Check provided address
  let normalRefund;
  let boostedRefund;
  try {
    const claimAmounts = await conversation.external(async () => {
      return await refundManager.getClaimAmount({
        poolObjectId: RefundManagerSingleton.REFUND_POOL_OBJECT_ID,
        affectedAddress: affectedPublicKey,
      });
    });

    normalRefund = claimAmounts.normalRefund;
    boostedRefund = claimAmounts.boostedRefund;
  } catch (error) {
    await ctx.reply('Something went wrong. Please, try again.', {
      reply_markup: retryButton,
    });

    return;
  }

  if (new BigNumber(normalRefund.mist).isEqualTo(0)) {
    await ctx.api.editMessageText(
      checkingMessage.chat.id,
      checkingMessage.message_id,
      'Your account is not affected or you already have claimed the refund. If you do not agree, please ' +
        'contact the support service.\n\nNow you can enter another address to check.',
      {
        reply_markup: closeConversation,
        parse_mode: 'HTML',
      },
    );

    await conversation.skip({ drop: true });
  }

  const baseRefundAmount = normalRefund.sui;
  const boostedRefundAmount = boostedRefund.sui;

  const cancelButtons = closeConversation.inline_keyboard[0];
  const importWalletWithContinueAndCancelKeyboard =
    importWalletWithContinueKeyboard
      .clone()
      .row()
      .add(...cancelButtons);

  await ctx.api.editMessageText(
    checkingMessage.chat.id,
    checkingMessage.message_id,
    `✅ We have found <code>${baseRefundAmount}</code> <b>SUI</b> to refund for this account.\n\n` +
      '✎ There are 2 ways, please choose one of them:\n\n' +
      '<i><b>1.</b></i> Import the checked wallet, use <b><i>Check Current Wallet</i></b> button on ' +
      "the <b><i>Refund</i></b> page you've seen before and then choose between 2 options:\n" +
      `    a) <b>Base refund</b> (100%) — <code>${baseRefundAmount}</code> <b>SUI</b> and free to ` +
      `withdraw/export private key.\n` +
      `    b) <b>Boosted refund</b> (150%) — <code>${boostedRefundAmount}</code> <b>SUI</b>, new secure ` +
      `account, ability to use all ` +
      `the features of RINbot, but you can withdraw only profit. <code>${boostedRefundAmount}</code> <b>SUI</b> are ` +
      `non-withdrawable. Also export private key feature will be disabled.\n\n` +
      '<i><b>2.</b></i> Continue to work without importing. Only <b>Boosted Refund</b> is enabled this way. ' +
      'We will prepare boosted refund claim, but you will have to manually use gist script to sign and ' +
      'execute required for refund transaction.',
    {
      reply_markup: importWalletWithContinueAndCancelKeyboard,
      parse_mode: 'HTML',
    },
  );

  const choiseContext = await conversation.wait();
  const choiseCallbackQueryData = choiseContext.callbackQuery?.data;

  if (choiseCallbackQueryData === CallbackQueryData.Cancel) {
    await conversation.skip();
  } else if (choiseCallbackQueryData === CallbackQueryData.ImportWallet) {
    await choiseContext.answerCallbackQuery();

    return await importNewWallet(conversation, ctx);
  } else if (choiseCallbackQueryData === CallbackQueryData.Continue) {
    await choiseContext.answerCallbackQuery();
  } else {
    await reactOnUnexpectedBehaviour(
      choiseContext,
      retryButton,
      'provided address check',
    );
    return;
  }

  // Exporting current wallet private key
  const warnWithCheckAndPrintSucceeded =
    await warnWithCheckAndPrivateKeyPrinting({
      conversation,
      ctx,
      operation: 'boosted refund',
      retryButton,
      warnMessage: boostedRefundExportPrivateKeyWarnMessage,
    });

  if (!warnWithCheckAndPrintSucceeded) {
    return;
  }

  const userHasStoredBoostedRefundAccount = await conversation.external(
    async () => {
      try {
        return await userHasBoostedRefundAccount(ctx);
      } catch (error) {
        console.error(
          '[checkProvidedAddress] Error while userHasBoostedRefundAccount():',
          error,
        );

        return false;
      }
    },
  );

  if (!userHasStoredBoostedRefundAccount) {
    await ctx.reply(
      'This is not secure to continue because of failed backup process. ' +
        'Please, try again later or contact support.',
      {
        reply_markup: refundsKeyboard,
        parse_mode: 'HTML',
      },
    );

    return;
  }

  if (conversation.session.refund.boostedRefundAccount === null) {
    await ctx.reply(
      'This is not secure to continue because of unexpected case of dialog scenario. ' +
        'Please, try again later or contact support.',
      { reply_markup: refundsKeyboard, parse_mode: 'HTML' },
    );

    return;
  }

  const boostedClaimCap = await conversation.external(async () => {
    try {
      return await refundManager.getBoostedClaimCap({
        ownerAddress: conversation.session.publicKey,
      });
    } catch (error) {
      console.error(
        '[checkProvidedAddress] Error while getBoostedClaimCap():',
        error,
      );

      return;
    }
  });

  if (boostedClaimCap) {
    await ctx.reply(
      '<b>Boosted refund</b> is already allowed for this account. Here is the <i><b>boosted claim cap</b></i> ' +
        `you should use in the <a href="${BOOSTED_REFUND_EXAMPLE_FOR_USER_URL}">gist example</a>:\n<code>` +
        `${boostedClaimCap}</code>\n\nFeel free to ask our support for help!`,
      { reply_markup: goHome, parse_mode: 'HTML' },
    );

    return;
  }

  // Allow user to claim boosted refund
  const transaction = await getTransactionFromMethod({
    conversation,
    ctx,
    method: RefundManagerSingleton.getAllowBoostedClaim,
    params: {
      affectedAddress: affectedPublicKey,
      newAddress: conversation.session.refund.boostedRefundAccount.publicKey,
      poolObjectId: RefundManagerSingleton.REFUND_POOL_OBJECT_ID,
      publisherObjectId: RefundManagerSingleton.REFUND_POOL_PUBLISHER_OBJECT_ID,
    },
  });

  if (transaction === undefined) {
    await ctx.reply(
      'Failed to create transaction for allowing boosted refund claim. Please, try again or contact support.',
      { reply_markup: retryButton },
    );

    return;
  }

  const result = await signAndExecuteTransaction({
    conversation,
    ctx,
    transaction,
    signerPrivateKey: ALDRIN_AUTHORITY,
  });

  if (
    result.result === TransactionResultStatus.Success &&
    result.digest !== undefined
  ) {
    // Store old user wallet credentials before switching to a new one
    conversation.session.refund.walletBeforeBoostedRefundClaim = {
      publicKey: conversation.session.publicKey,
      privateKey: conversation.session.privateKey,
    };

    // Switch to the new wallet
    conversation.session.publicKey =
      conversation.session.refund.boostedRefundAccount.publicKey;
    conversation.session.privateKey =
      conversation.session.refund.boostedRefundAccount.privateKey;
    conversation.session.refund.claimedBoostedRefund = true;
    conversation.session.refund.boostedRefundAmount = boostedRefundAmount;

    await ctx.reply(
      `<b>Boosted refund</b> is <a href="${getSuiVisionTransactionLink(result.digest)}">successfully claimed</a>!\n\n` +
        `Here is the <i><b>boosted claim cap</b></i> you should use in ` +
        `<a href="${BOOSTED_REFUND_EXAMPLE_FOR_USER_URL}">gist example</a>:\n` +
        `<code>${boostedClaimCap}</code>\n\nFeel free to ask our support for help!`,
      {
        reply_markup: goHome,
        parse_mode: 'HTML',
      },
    );

    return;
  }

  if (
    result.result === TransactionResultStatus.Failure &&
    result.digest !== undefined
  ) {
    await ctx.reply(
      `<a href="${getSuiVisionTransactionLink(result.digest)}">Failed</a> to allow the <b>boosted refund</b>. ` +
        `Please, try again or contact support.`,
      {
        reply_markup: retryButton,
        parse_mode: 'HTML',
      },
    );

    return;
  }

  await ctx.reply(
    'Failed to allow the <b>boosted refund</b>. Please, try again or contact support.',
    {
      reply_markup: retryButton,
      parse_mode: 'HTML',
    },
  );

  return;
}
