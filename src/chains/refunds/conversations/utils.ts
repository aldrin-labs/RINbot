import { RefundManagerSingleton } from '@avernikoz/rinbot-sui-sdk';
import { InlineKeyboard } from 'grammy';
import { ALDRIN_AUTHORITY } from '../../../config/bot.config';
import assetsWithHomeKeyboard from '../../../inline-keyboards/mixed/assets-with-home';
import refundsKeyboard from '../../../inline-keyboards/refunds';
import { BotContext, MyConversation } from '../../../types';
import {
  getTransactionFromMethod,
  signAndExecuteTransaction,
} from '../../conversations.utils';
import { TransactionResultStatus } from '../../sui.functions';
import { getSuiVisionTransactionLink } from '../../utils';
import { warnWithCheckAndPrivateKeyPrinting } from '../../wallet/utils';
import { getRefundManager } from '../getRefundManager';
import { userHasBoostedRefundAccount } from '../utils';
import { boostedRefundExportPrivateKeyWarnMessage } from './config';

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
        reply_markup: assetsWithHomeKeyboard,
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
  boostedRefundAmount,
}: {
  ctx: BotContext;
  conversation: MyConversation;
  retryButton: InlineKeyboard;
  boostedRefundAmount: string;
}): Promise<void> {
  const refundManager = getRefundManager();

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

  const userHasStoredBoostedRefundAccount = await conversation.external(
    async () => {
      try {
        return await userHasBoostedRefundAccount(ctx);
      } catch (error) {
        console.error(
          '[claimBoostedRefund] Error while userHasBoostedRefundAccount():',
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

  let boostedClaimCap = await conversation.external(async () => {
    try {
      return await refundManager.getBoostedClaimCap({
        ownerAddress: conversation.session.publicKey,
      });
    } catch (error) {
      console.error(
        '[claimBoostedRefund] Error while getBoostedClaimCap():',
        error,
      );

      return;
    }
  });

  if (boostedClaimCap === undefined) {
    await ctx.reply('<b>Preparing boosted claim...</b>', {
      parse_mode: 'HTML',
    });

    const allowBoostedClaimTransaction = await getTransactionFromMethod({
      conversation,
      ctx,
      method: RefundManagerSingleton.getAllowBoostedClaim,
      params: {
        affectedAddress: conversation.session.publicKey,
        newAddress: conversation.session.refund.boostedRefundAccount.publicKey,
        poolObjectId: RefundManagerSingleton.REFUND_POOL_OBJECT_ID,
        publisherObjectId:
          RefundManagerSingleton.REFUND_POOL_PUBLISHER_OBJECT_ID,
      },
    });

    if (allowBoostedClaimTransaction === undefined) {
      await ctx.reply(
        'Failed to create transaction for allowing boosted claim. Please, try again later or contact support.',
        { reply_markup: retryButton },
      );

      return;
    }

    const allowBoostedClaimResult = await signAndExecuteTransaction({
      conversation,
      ctx,
      transaction: allowBoostedClaimTransaction,
      signerPrivateKey: ALDRIN_AUTHORITY,
    });

    if (
      allowBoostedClaimResult.result === TransactionResultStatus.Success &&
      allowBoostedClaimResult.digest !== undefined
    ) {
      await ctx.reply(
        `<a href="${getSuiVisionTransactionLink(allowBoostedClaimResult.digest)}">Successfully prepared</a>` +
          ` the <b>boosted refund</b> claim!`,
        {
          parse_mode: 'HTML',
        },
      );
    } else if (
      allowBoostedClaimResult.result === TransactionResultStatus.Failure &&
      allowBoostedClaimResult.digest !== undefined
    ) {
      await ctx.reply(
        `<a href="${getSuiVisionTransactionLink(allowBoostedClaimResult.digest)}">Failed to prepare</a> ` +
          `the <b>boosted claim</b>. Please, try again or contact support.`,
        { reply_markup: retryButton, parse_mode: 'HTML' },
      );

      return;
    } else {
      await ctx.reply(
        `Failed to prepare the <b>boosted claim</b>. Please, try again or contact support.`,
        { reply_markup: retryButton, parse_mode: 'HTML' },
      );

      return;
    }

    boostedClaimCap = await conversation.external(async () => {
      try {
        return await refundManager.getBoostedClaimCap({
          ownerAddress: conversation.session.publicKey,
        });
      } catch (error) {
        console.error(
          '[claimBoostedRefund] Error while getBoostedClaimCap():',
          error,
        );

        return;
      }
    });
  }

  if (boostedClaimCap === undefined) {
    await ctx.reply(
      `Failed to prepare the <b>boosted claim</b>. Please, try again or contact support.`,
      { reply_markup: retryButton, parse_mode: 'HTML' },
    );

    return;
  }

  await ctx.reply('<b>Claiming the boosted refund...</b>', {
    parse_mode: 'HTML',
  });

  // Create transaction to claim refund
  const transaction = await getTransactionFromMethod({
    conversation,
    ctx,
    method: RefundManagerSingleton.getClaimRefundBoostedTransaction,
    params: {
      boostedClaimCap,
      poolObjectId: RefundManagerSingleton.REFUND_POOL_OBJECT_ID,
    },
  });

  if (transaction === undefined) {
    await ctx.reply(
      'Failed to create transaction for claiming the <b>boosted refund</b>. Please, try again or contact support.',
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
      `<b>Boosted refund</b> is <a href="${getSuiVisionTransactionLink(result.digest)}">successfully claimed</a>!`,
      {
        reply_markup: assetsWithHomeKeyboard,
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
