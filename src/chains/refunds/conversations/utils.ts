import {
  RefundManagerSingleton,
  WalletManagerSingleton,
} from '@avernikoz/rinbot-sui-sdk';
import { InlineKeyboard } from 'grammy';
import { BotContext, MyConversation } from '../../../types';
import {
  getTransactionFromMethod,
  signAndExecuteTransaction,
} from '../../conversations.utils';
import { TransactionResultStatus, generateWallet } from '../../sui.functions';
import { getSuiVisionTransactionLink } from '../../utils';
import { warnWithCheckAndPrivateKeyPrinting } from '../../wallet/utils';
import { boostedRefundExportPrivateKeyWarnMessage } from './config';
import { ALDRIN_AUTHORITY } from '../../../config/bot.config';

export async function claimBaseRefund({
  ctx,
  conversation,
  retryButton,
}: {
  ctx: BotContext;
  conversation: MyConversation;
  retryButton: InlineKeyboard;
}): Promise<void> {
  const transaction = await getTransactionFromMethod({
    conversation,
    ctx,
    method: RefundManagerSingleton.getClaimRefundTransaction,
    params: {
      poolObjectId: RefundManagerSingleton.REFUND_POOL_OBJECT_ID,
    },
  });

  if (transaction === undefined) {
    await ctx.reply(
      'Failed to create transaction for <b>base refund</b>. Please, try again or contact support.',
      { reply_markup: retryButton, parse_mode: 'HTML' },
    );

    return;
  }

  const result = await signAndExecuteTransaction({
    conversation,
    ctx,
    transaction,
  });

  if (
    result.result === TransactionResultStatus.Success &&
    result.digest !== undefined
  ) {
    await ctx.reply(
      `<b>Base refund</b> is <a href="${getSuiVisionTransactionLink(result.digest)}">successfully claimed</a>!`,
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
      `<a href="${getSuiVisionTransactionLink(result.digest)}">Failed</a> to claim <b>base refund</b>.`,
      {
        reply_markup: retryButton,
        parse_mode: 'HTML',
      },
    );

    return;
  }

  await ctx.reply('Failed to claim <b>base refund</b>.', {
    reply_markup: retryButton,
    parse_mode: 'HTML',
  });

  return;
}

export async function claimBoostedRefund({
  ctx,
  conversation,
  retryButton,
}: {
  ctx: BotContext;
  conversation: MyConversation;
  retryButton: InlineKeyboard;
}): Promise<void> {
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
  console.debug(
    'boostedRefundAccount:',
    conversation.session.refund.boostedRefundAccount,
  );

  // Create an account for boosted user refund and store it to the session
  if (conversation.session.refund.boostedRefundAccount === null) {
    console.debug('boosted refund account generation');
    const { publicKey, privateKey } = generateWallet();

    conversation.session.refund.boostedRefundAccount = {
      publicKey,
      privateKey,
    };
    console.debug(
      'boostedRefundAccount after generation:',
      conversation.session.refund.boostedRefundAccount,
    );
  }

  const { signature } = await conversation.external({
    args: [conversation.session.refund.boostedRefundAccount.publicKey],
    task: (newAddress: string) =>
      RefundManagerSingleton.signMessageSignatureForBoostedRefund({
        keypair: WalletManagerSingleton.getKeyPairFromPrivateKey(
          conversation.session.privateKey,
        ),
        affectedAddress: conversation.session.publicKey,
        newAddress,
        poolObjectId: RefundManagerSingleton.REFUND_POOL_OBJECT_ID,
      }),
  });
  console.debug('signature:', signature);

  try {
    const signedMessageIsValid =
      await RefundManagerSingleton.verifySignedMessageForBoostedRefund({
        affectedAddress: conversation.session.publicKey,
        newAddress: conversation.session.refund.boostedRefundAccount.publicKey,
        signedMessageSignature: signature,
        poolObjectId: RefundManagerSingleton.REFUND_POOL_OBJECT_ID,
      });

    if (!signedMessageIsValid) {
      await ctx.reply(
        'Created signature is not valid. Please, try again or contact support.',
        { reply_markup: retryButton },
      );

      return;
    }
  } catch (error) {
    console.error(error);

    await ctx.reply(
      'Created signature is not valid. Please, try again or contact support.',
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
      affectedAddress: conversation.session.publicKey,
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
