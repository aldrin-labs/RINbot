import {
  RefundManagerSingleton,
  isValidSuiAddress,
} from '@avernikoz/rinbot-sui-sdk';
import BigNumber from 'bignumber.js';
import { ALDRIN_AUTHORITY } from '../../../config/bot.config';
import closeConversation from '../../../inline-keyboards/closeConversation';
import goHome from '../../../inline-keyboards/goHome';
import importWalletKeyboard from '../../../inline-keyboards/import-wallet';
import confirmWithCloseKeyboard from '../../../inline-keyboards/mixed/confirm-with-close';
import refundOptionsKeyboard from '../../../inline-keyboards/refund-options';
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
  const optionsWithCloseKeyboard = refundOptionsKeyboard
    .clone()
    .row()
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
    `✅ We have identified <code>${baseRefundAmount}</code> <b>SUI</b> available for refunding to your account.`,
    {
      parse_mode: 'HTML',
    },
  );

  await ctx.reply(
    '📝 Here are <b>two options</b> for the refund:\n\n' +
      `💵 1. <b>Base Refund</b>: Receive <i><b>100%</b></i> of your lost funds — <code>${baseRefundAmount}` +
      '</code> <b>SUI</b>.\n\n' +
      `💸 2. <b>Boosted Refund</b>: Enjoy <i><b>150%</b></i> of your lost funds — <code>${boostedRefundAmount}` +
      '</code> <b>SUI</b>.\nWhile all features ' +
      'of the RINbot remain accessible, ' +
      `you'll be able to withdraw only profits. The initial refund amount of <code>${boostedRefundAmount}</code>` +
      ' <b>SUI</b> will be non-withdrawable.',
    {
      reply_markup: optionsWithCloseKeyboard,
      parse_mode: 'HTML',
    },
  );

  let userConfirmedChoise = false;
  do {
    const choiseContext = await conversation.wait();
    const choiseCallbackQueryData = choiseContext.callbackQuery?.data;

    if (choiseCallbackQueryData === CallbackQueryData.Cancel) {
      await conversation.skip();
    } else if (choiseCallbackQueryData === CallbackQueryData.BaseRefund) {
      await choiseContext.answerCallbackQuery();

      await ctx.reply(
        `To proceed with the <b>base refund</b>, just visit <a href="${ALDRIN_REFUND_WEBSITE}">Aldrin Refund Website</a>.`,
        {
          reply_markup: retryButton,
          parse_mode: 'HTML',
          link_preview_options: { is_disabled: true },
        },
      );

      return;
    } else if (choiseCallbackQueryData === CallbackQueryData.BoostedRefund) {
      await choiseContext.answerCallbackQuery();

      await ctx.reply(
        `Please, confirm your choice — <b>boosted refund</b> (<code>${boostedRefundAmount}</code> <b>SUI</b>).`,
        {
          reply_markup: confirmWithCloseKeyboard,
          parse_mode: 'HTML',
        },
      );

      const confirmContext = await conversation.wait();
      const confirmCallbackQueryData = confirmContext.callbackQuery?.data;

      if (confirmCallbackQueryData === CallbackQueryData.Cancel) {
        await confirmContext.answerCallbackQuery();

        await ctx.reply('Please, select your preferred option.', {
          reply_markup: optionsWithCloseKeyboard,
        });

        continue;
      } else if (confirmCallbackQueryData === CallbackQueryData.Confirm) {
        await confirmContext.answerCallbackQuery();
        userConfirmedChoise = true;

        break;
      } else {
        await reactOnUnexpectedBehaviour(
          confirmContext,
          retryButton,
          'current wallet check',
        );
        return;
      }
    } else {
      await reactOnUnexpectedBehaviour(
        choiseContext,
        retryButton,
        'current wallet check',
      );
      return;
    }
  } while (!userConfirmedChoise);

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
        '<b>boosted refund</b> following the next steps:\n' +
        `<b>1.</b> Go to the <a href="${ALDRIN_REFUND_WEBSITE}"><b>Aldrin Refund Website</b></a>.\n` +
        '<b>2.</b> Connect your affected wallet.\n' +
        '<b>3.</b> On the left side of the page enter your RINbot wallet address: ' +
        `<code>${conversation.session.refund.boostedRefundAccount.publicKey}</code>\n` +
        '<b>4.</b> Press <b><i>Check validity</i></b> button.\n' +
        `<b>5.</b> Press <b><i>Claim ${boostedRefundAmount} SUI</i></b> button, sign the transaction and enjoy your ` +
        '<b>boosted refund</b> on the RINbot account!',
      {
        reply_markup: goHome,
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true },
      },
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
        `This operation requires your authority, so please, follow the next steps:\n` +
        `<b>1.</b> Go to the <a href="${ALDRIN_REFUND_WEBSITE}"><b>Aldrin Refund Website</b></a>.\n` +
        '<b>2.</b> Connect your affected wallet.\n' +
        '<b>3.</b> On the left side of the page enter your RINbot wallet address: ' +
        `<code>${conversation.session.refund.boostedRefundAccount.publicKey}</code>\n` +
        '<b>4.</b> Press <b><i>Check validity</i></b> button.\n' +
        '<b>5.</b> Press <b><i>Reset Capabilities</i></b> button and sign the transaction.\n' +
        '<b>6.</b> Inappropriate boosted claim cap is burned now, so you can just press the <i><b>Retry</b></i> ' +
        'button to prepare the <b>boosted refund</b>.',
      {
        reply_markup: retryButton,
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true },
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
        'Now you can easily continue claiming the <b>boosted refund</b> following the next steps:\n' +
        `<b>1.</b> Go to the <a href="${ALDRIN_REFUND_WEBSITE}"><b>Aldrin Refund Website</b></a>.\n` +
        '<b>2.</b> Connect your affected wallet.\n' +
        '<b>3.</b> On the left side of the page enter your RINbot wallet address: ' +
        `<code>${conversation.session.refund.boostedRefundAccount.publicKey}</code>\n` +
        '<b>4.</b> Press <b><i>Check validity</i></b> button.\n' +
        `<b>5.</b> Press <b><i>Claim ${boostedRefundAmount} SUI</i></b> button, sign the transaction and enjoy your ` +
        '<b>boosted refund</b> on the RINbot account!',
      {
        reply_markup: goHome,
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true },
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
        link_preview_options: { is_disabled: true },
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
