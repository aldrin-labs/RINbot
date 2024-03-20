import {
  RefundManagerSingleton,
  SUI_DENOMINATOR,
  isValidSuiAddress,
} from '@avernikoz/rinbot-sui-sdk';
import BigNumber from 'bignumber.js';
import { ALDRIN_AUTHORITY } from '../../../config/bot.config';
import closeConversation from '../../../inline-keyboards/closeConversation';
import { retryAndGoHomeButtonsData } from '../../../inline-keyboards/retryConversationButtonsFactory';
import { BotContext, MyConversation } from '../../../types';
import { CallbackQueryData } from '../../../types/callback-queries-data';
import { ConversationId } from '../../conversations.config';
import {
  getTransactionFromMethod,
  signAndExecuteTransaction,
} from '../../conversations.utils';
import { TransactionResultStatus, generateWallet } from '../../sui.functions';
import {
  getSuiVisionTransactionLink,
  reactOnUnexpectedBehaviour,
} from '../../utils';
import { warnWithCheckAndPrivateKeyPrinting } from '../../wallet/utils';
import { getAffectedAddressData } from '../utils';
import { boostedRefundExportPrivateKeyWarnMessage } from './config';

export async function checkProvidedAddress(
  conversation: MyConversation,
  ctx: BotContext,
) {
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
      {},
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
  const affectedAddressData = await conversation.external(() =>
    getAffectedAddressData(affectedPublicKey),
  );

  if (affectedAddressData === undefined) {
    await ctx.api.editMessageText(
      checkingMessage.chat.id,
      checkingMessage.message_id,
      'We have <b>not found any traces of a scam</b> for this account. If you do not agree, please ' +
        'contact the support service.\n\nNow you can enter another address to check.',
      {
        reply_markup: closeConversation,
        parse_mode: 'HTML',
      },
    );

    await conversation.skip({ drop: true });
  }

  // ts check
  if (affectedAddressData === undefined) {
    await ctx.api.editMessageText(
      checkingMessage.chat.id,
      checkingMessage.message_id,
      'Cannot process affected address data. Please, try again later ot contact support.',
      { reply_markup: retryButton },
    );
    return;
  }

  // TODO: Add flow when user already claimed funds for this account
  const { amount } = affectedAddressData;
  const boostedRefundAmountMultiplier = 1.5;
  const baseRefundAmount = new BigNumber(amount)
    .div(SUI_DENOMINATOR)
    .toString();
  const boostedRefundAmount = new BigNumber(baseRefundAmount)
    .multipliedBy(boostedRefundAmountMultiplier)
    .toString();

  await ctx.api.editMessageText(
    checkingMessage.chat.id,
    checkingMessage.message_id,
    `We have found <code>${baseRefundAmount}</code> <b>SUI</b> to refund for this account.`,
    {
      reply_markup: closeConversation,
      parse_mode: 'HTML',
    },
  );

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

  // Create an account for boosted user refund and store it to the session
  if (conversation.session.refund.boostedRefundAccount === null) {
    const { publicKey, privateKey } = generateWallet();

    conversation.session.refund.boostedRefundAccount = {
      publicKey,
      privateKey,
    };
  }

  const { hex: message } = RefundManagerSingleton.getMessageForBoostedRefund({
    poolObjectId: RefundManagerSingleton.REFUND_POOL_OBJECT_ID,
    affectedAddress: affectedPublicKey,
    newAddress: conversation.session.refund.boostedRefundAccount.publicKey,
  });

  await ctx.reply(
    `💸 <b>Boosted Refund</b> is chosen: 150% — <code>${boostedRefundAmount}</code> <b>SUI</b>.\n\n` +
      `Here is your message: <code>${message}</code>\n\nUse <a href="https://github.com">the script</a> to ` +
      'sign it and then enter the signature :)',
    { reply_markup: closeConversation, parse_mode: 'HTML' },
  );

  const signatureContext = await conversation.wait();
  const signatureCallbackQueryData = signatureContext.callbackQuery?.data;
  const signature = signatureContext.msg?.text;

  if (signatureCallbackQueryData === CallbackQueryData.Cancel) {
    await conversation.skip();
  } else if (signature !== undefined) {
    const signedMessageIsValid =
      await RefundManagerSingleton.verifySignedMessageForBoostedRefund({
        poolObjectId: RefundManagerSingleton.REFUND_POOL_OBJECT_ID,
        affectedAddress: affectedPublicKey,
        newAddress: conversation.session.refund.boostedRefundAccount.publicKey,
        signedMessageSignature: signature,
      });

    if (!signedMessageIsValid) {
      await ctx.reply('Signature is invalid. Please, enter a valid one.', {
        reply_markup: closeConversation,
      });

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

  if (signature === undefined) {
    await ctx.reply(
      'Cannot process the signed message. Please, try again or contact support.',
      { reply_markup: retryButton },
    );

    return;
  }

  // Create transaction to claim refund with signature
  const transaction = await getTransactionFromMethod({
    conversation,
    ctx,
    method: RefundManagerSingleton.getClaimRefundBoosted,
    params: {
      affectedAddress: affectedPublicKey,
      newAddress: conversation.session.refund.boostedRefundAccount.publicKey,
      poolObjectId: RefundManagerSingleton.REFUND_POOL_OBJECT_ID,
      publisherObjectId: RefundManagerSingleton.REFUND_POOL_PUBLISHER_OBJECT_ID,
      signature,
    },
  });

  if (transaction === undefined) {
    await ctx.reply(
      'Failed to create transaction for claiming boosted refund. Please, try again or contact support.',
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

    await ctx.reply(
      `<b>Boosted refund</b> is <a href="${getSuiVisionTransactionLink(result.digest)}">successfully claimed</a>!`,
      {
        reply_markup: retryButton,
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
      `<a href="${getSuiVisionTransactionLink(result.digest)}">Failed</a> to claim the <b>boosted refund</b>.`,
      {
        reply_markup: retryButton,
        parse_mode: 'HTML',
      },
    );

    return;
  }

  await ctx.reply('Failed to claim the <b>boosted refund</b>.', {
    reply_markup: retryButton,
    parse_mode: 'HTML',
  });

  return;
}
