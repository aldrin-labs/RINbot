import {
  RefundManagerSingleton,
  isValidSuiAddress,
} from '@avernikoz/rinbot-sui-sdk';
import BigNumber from 'bignumber.js';
import { ALDRIN_AUTHORITY } from '../../../config/bot.config';
import closeConversation from '../../../inline-keyboards/closeConversation';
import goHome from '../../../inline-keyboards/goHome';
import importWalletKeyboard from '../../../inline-keyboards/import-wallet';
import continueWithCancelKeyboard from '../../../inline-keyboards/mixed/continue-with-cancel';
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
import { warnWithCheckAndPrivateKeyPrinting } from '../../wallet/utils';
import { getRefundManager } from '../getRefundManager';
import { userHasBackupedAccount, userHasBoostedRefundAccount } from '../utils';
import {
  ALDRIN_REFUND_WEBSITE,
  boostedRefundExportPrivateKeyWarnMessage,
} from './config';
import { getBoostedClaimCap } from './utils';

export async function checkProvidedAddress(
  conversation: MyConversation,
  ctx: BotContext,
) {
  const refundManager = getRefundManager();
  const retryButton =
    retryAndGoHomeButtonsData[ConversationId.CheckProvidedAddressForRefund];

  const retryButtons = retryButton.inline_keyboard[0];
  const importWalletWithRetryKeyboard = importWalletKeyboard
    .clone()
    .row()
    .add(...retryButtons);

  const closeButtons = closeConversation.inline_keyboard[0];
  const importWalletWithCancelKeyboard = importWalletKeyboard
    .clone()
    .add(...closeButtons);

  // Ask user for address he wants to check
  await ctx.reply(
    'Please enter the <b>address</b> of your wallet that you wish to check.',
    {
      reply_markup: closeConversation,
      parse_mode: 'HTML',
    },
  );

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
        'Entered <b>address</b> is not valid. Please, enter a valid one.',
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
      'Cannot process provided address. Please, try again or contact support.',
      { reply_markup: retryButton },
    );

    return;
  }

  const checkingMessage = await ctx.reply(
    '<b>Checking entered account address. This may take some time...</b>',
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
    await ctx.reply(
      'An error occurred while retrieving the claim amount. Please try again.',
      {
        reply_markup: retryButton,
      },
    );

    return;
  }

  if (new BigNumber(normalRefund.mist).isEqualTo(0)) {
    await ctx.api.editMessageText(
      checkingMessage.chat.id,
      checkingMessage.message_id,
      '✅ Your account is either not affected or you have already claimed the refund. ' +
        'If you have any questions, feel free to reach out to us.' +
        '\n\nNow you can enter another address to check.',
      {
        reply_markup: closeConversation,
        parse_mode: 'HTML',
      },
    );

    await conversation.skip({ drop: true });
  }

  const baseRefundAmount = normalRefund.sui;
  const boostedRefundAmount = boostedRefund.sui;

  // const cancelButtons = closeConversation.inline_keyboard[0];
  // const importWalletWithContinueAndCancelKeyboard =
  //   importWalletWithContinueKeyboard
  //     .clone()
  //     .row()
  //     .add(...cancelButtons);

  await ctx.api.editMessageText(
    checkingMessage.chat.id,
    checkingMessage.message_id,
    `✅ We have found <code>${baseRefundAmount}</code> <b>SUI</b> to refund for your account.\n\n` +
      `✎ After pressing <b><i>Continue</i></b> button you will proceed with <b>Boosted Refund</b> — ` +
      `<i><b>150%</b></i> of your lost funds — <code>${boostedRefundAmount}</code> <b>SUI</b>.\n` +
      `While all features of the RINbot remain accessible, you'll be able to withdraw only profits. ` +
      `The initial refund amount of <code>${boostedRefundAmount}</code> <b>SUI</b> will be non-withdrawable.`,
    {
      reply_markup: continueWithCancelKeyboard,
      parse_mode: 'HTML',
    },
  );

  const choiseContext = await conversation.wait();
  const choiseCallbackQueryData = choiseContext.callbackQuery?.data;

  if (choiseCallbackQueryData === CallbackQueryData.Cancel) {
    await conversation.skip();
  } /* else if (choiseCallbackQueryData === CallbackQueryData.ImportWallet) {
    await choiseContext.answerCallbackQuery();

    return await importNewWallet(conversation, ctx);
  } */ else if (choiseCallbackQueryData === CallbackQueryData.Continue) {
    await choiseContext.answerCallbackQuery();
  } else {
    await reactOnUnexpectedBehaviour(
      choiseContext,
      retryButton,
      'provided address check',
    );
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
      "It's not safe to continue due to the failed backup account process. " +
        'Please, try again later or contact support.',
      {
        reply_markup: refundsKeyboard,
        parse_mode: 'HTML',
      },
    );

    return;
  }

  const userHasBackupedAccountForRefund = await conversation.external(
    async () => {
      try {
        return await userHasBackupedAccount(ctx);
      } catch (error) {
        console.error(
          '[checkProvidedAddress] Error while userHasBackupedAccount():',
          error,
        );

        return false;
      }
    },
  );

  if (!userHasBackupedAccountForRefund) {
    await ctx.reply(
      "It's not safe to continue due to the failed backup account process. " +
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
      "It's not safe to continue due to unexpected case of dialog scenario. " +
        'Please, try again later or contact support.',
      { reply_markup: refundsKeyboard, parse_mode: 'HTML' },
    );

    return;
  }

  let boostedClaimCap = await getBoostedClaimCap({
    conversation,
    refundManager,
    ownerAddress: affectedPublicKey,
  });

  if (boostedClaimCap === undefined) {
    await ctx.reply(
      'Something went wrong while fetching preparing state. Please, try again later or contact support.',
      { reply_markup: retryButton },
    );

    return;
  }

  let {
    boostedClaimCapObjectId,
    boostedClaimCapNotAssociatedWithNewAddressObjectId,
    isAnyBoostedClaimCapExists,
  } = boostedClaimCap;

  if (boostedClaimCapObjectId !== null) {
    await ctx.reply(
      '<b>Boosted refund</b> is already prepared for this account.\n\nNow you can easily continue claiming the ' +
        `<b>boosted refund</b> on our <a href="${ALDRIN_REFUND_WEBSITE}">refund website</a> using your ` +
        `RINbot wallet address: <code>${conversation.session.refund.boostedRefundAccount.publicKey}</code>.`,
      { reply_markup: goHome, parse_mode: 'HTML' },
    );

    return;
  } else if (
    boostedClaimCapObjectId === null &&
    isAnyBoostedClaimCapExists &&
    boostedClaimCapNotAssociatedWithNewAddressObjectId !== null
  ) {
    // If boosted claim cap exists, but with not corresponding `newAddress` — notify user and exit conversation.
    await ctx.reply(
      'We have found an inappropriate boosted claim cap. It could be created by a bad actor and must be ' +
        '<i><b>burned</b></i> to safely bring your refund.\n\n' +
        `This operation requires your authority, so please, visit our <a href="${ALDRIN_REFUND_WEBSITE}">` +
        'refund website</a> to safely connect your affected wallet, check validity of your future RINbot ' +
        'wallet address (showed below) and burn inappropriate boosted claim cap (available on the website).\n' +
        'After burning you should just repeat the same actions here to prepare your <b>boosted refund</b>.\n\n' +
        `Your RINbot wallet address that should be passed on the <a href="${ALDRIN_REFUND_WEBSITE}">refund website</a>: ` +
        `<code>${conversation.session.refund.boostedRefundAccount.publicKey}</code>.`,
      {
        reply_markup: retryButton,
        parse_mode: 'HTML',
      },
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
      'Failed to create transaction for preparing boosted refund claim. Please, try again or contact support.',
      { reply_markup: retryButton },
    );

    return;
  }

  await ctx.reply('<b>Preparing boosted refund claim...</b>', {
    parse_mode: 'HTML',
  });

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
    // Switch to the new wallet
    conversation.session.publicKey =
      conversation.session.refund.boostedRefundAccount.publicKey;
    conversation.session.privateKey =
      conversation.session.refund.boostedRefundAccount.privateKey;
    conversation.session.refund.claimedBoostedRefund = true;
    conversation.session.refund.boostedRefundAmount = boostedRefundAmount;

    await ctx.reply(
      `<b>Boosted refund</b> is <a href="${getSuiVisionTransactionLink(result.digest)}">successfully prepared</a>! ` +
        'You have been switched to your new RINbot wallet.\n\n' +
        'Now you can easily complete claiming the <b>boosted refund</b> on our ' +
        `<a href="${ALDRIN_REFUND_WEBSITE}">refund website</a>.\n\n` +
        `Your current RINbot wallet address that should be passed on the website: ` +
        `<code>${conversation.session.refund.boostedRefundAccount.publicKey}</code>.\n` +
        'After successful completion all the funds will be transferred to your current RINbot wallet.',
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
      `<a href="${getSuiVisionTransactionLink(result.digest)}">Failed</a> to prepare the <b>boosted refund</b>. ` +
        `Please, try again or contact support.`,
      {
        reply_markup: retryButton,
        parse_mode: 'HTML',
      },
    );

    return;
  }

  await ctx.reply(
    'Failed to prepare the <b>boosted refund</b>. Please, try again or contact support.',
    {
      reply_markup: retryButton,
      parse_mode: 'HTML',
    },
  );

  return;
}
