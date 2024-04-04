import { RefundManagerSingleton } from '@avernikoz/rinbot-sui-sdk';
import { InlineKeyboard } from 'grammy';
import { ALDRIN_AUTHORITY } from '../../../config/bot.config';
import assetsWithHomeKeyboard from '../../../inline-keyboards/mixed/assets-with-home';
import refundsKeyboard from '../../../inline-keyboards/refunds';
import { BotContext, MyConversation } from '../../../types';
import { getTransactionFromMethod, signAndExecuteTransaction } from '../../conversations.utils';
import { TransactionResultStatus } from '../../sui.functions';
import { getSuiVisionTransactionLink } from '../../utils';
import { warnWithCheckAndPrivateKeyPrinting } from '../../wallet/utils';
import { getRefundManager } from '../getRefundManager';
import { userHasBackupedAccount, userHasBoostedRefundAccount } from '../utils';
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
    await ctx.reply('Failed to create transaction for <b>base refund</b>. Please, try again or reach out to us.', {
      reply_markup: retryButton,
      parse_mode: 'HTML',
    });

    return;
  }

  await ctx.reply('<b>Claiming the base refund...</b>', { parse_mode: 'HTML' });

  const result = await signAndExecuteTransaction({
    conversation,
    ctx,
    transaction,
  });

  if (result.result === TransactionResultStatus.Success && result.digest !== undefined) {
    await ctx.reply(
      `<b>Base refund</b> is <a href="${getSuiVisionTransactionLink(result.digest)}">successfully claimed</a>!`,
      {
        reply_markup: assetsWithHomeKeyboard,
        parse_mode: 'HTML',
      },
    );

    return;
  }

  if (result.result === TransactionResultStatus.Failure && result.digest !== undefined) {
    await ctx.reply(`<a href="${getSuiVisionTransactionLink(result.digest)}">Failed</a> to claim <b>base refund</b>.`, {
      reply_markup: retryButton,
      parse_mode: 'HTML',
    });

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
  const warnWithCheckAndPrintSucceeded = await warnWithCheckAndPrivateKeyPrinting({
    conversation,
    ctx,
    operation: 'boosted refund',
    retryButton,
    warnMessage: boostedRefundExportPrivateKeyWarnMessage,
  });

  if (!warnWithCheckAndPrintSucceeded) {
    return;
  }

  const userHasStoredBoostedRefundAccount = await conversation.external(async () => {
    try {
      return await userHasBoostedRefundAccount(ctx);
    } catch (error) {
      console.error('[claimBoostedRefund] Error while userHasBoostedRefundAccount():', error);

      return false;
    }
  });

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

  const userHasBackupedAccountForRefund = await conversation.external(async () => {
    try {
      return await userHasBackupedAccount(ctx);
    } catch (error) {
      console.error('[claimBoostedRefund] Error while userHasBackupedAccount():', error);

      return false;
    }
  });

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
      "It's not safe to continue because of unexpected case of dialog scenario. " +
        'Please, try again later or contact support.',
      { reply_markup: refundsKeyboard, parse_mode: 'HTML' },
    );

    return;
  }

  let boostedClaimCap = await getBoostedClaimCap({
    conversation,
    refundManager,
  });

  if (boostedClaimCap === undefined) {
    await ctx.reply(
      'Something went wrong while fetching preparing state. Please, try again later or contact support.',
      { reply_markup: retryButton },
    );

    return;
  }

  let { boostedClaimCapObjectId, isAnyBoostedClaimCapExists, boostedClaimCapNotAssociatedWithNewAddressObjectId } =
    boostedClaimCap;

  // If there is no any boosted claim cap — just create it.
  if (!isAnyBoostedClaimCapExists) {
    const createdSuccessfully = await createBoostedClaimCap({
      conversation,
      ctx,
      retryButton,
    });

    if (!createdSuccessfully) {
      return;
    }

    boostedClaimCap = await getBoostedClaimCap({
      conversation,
      refundManager,
    });
  } else if (
    boostedClaimCapObjectId === null &&
    isAnyBoostedClaimCapExists &&
    boostedClaimCapNotAssociatedWithNewAddressObjectId !== null
  ) {
    // If boosted claim cap exists, but with not corresponding `newAddress` — burn it and create a new one.
    await ctx.reply('<b>Inappropriate boosted claim cap found. Burning it to safely bring your money...</b>', {
      parse_mode: 'HTML',
    });

    const burnTransaction = await getTransactionFromMethod({
      conversation,
      ctx,
      method: RefundManagerSingleton.getReturnBoosterCapTransaction,
      params: {
        poolObjectId: RefundManagerSingleton.REFUND_POOL_OBJECT_ID,
        boostedClaimCap: boostedClaimCapNotAssociatedWithNewAddressObjectId,
      },
    });

    if (burnTransaction === undefined) {
      await ctx.reply(
        'Failed to create transaction for burning inappropriate boosted claim cap. ' +
          'Please, try again later or contact support.',
        { reply_markup: retryButton },
      );

      return;
    }

    const burnResult = await signAndExecuteTransaction({
      conversation,
      ctx,
      transaction: burnTransaction,
    });

    if (burnResult.result === TransactionResultStatus.Success && burnResult.digest !== undefined) {
      await ctx.reply(
        `<a href="${getSuiVisionTransactionLink(burnResult.digest)}">Successfully burned</a> inappropriate boosted ` +
          'claim cap.',
        { reply_markup: retryButton, parse_mode: 'HTML' },
      );
    } else if (burnResult.result === TransactionResultStatus.Failure && burnResult.digest !== undefined) {
      await ctx.reply(
        `<a href="${getSuiVisionTransactionLink(burnResult.digest)}">Failed</a> to burn inappropriate boosted ` +
          'claim cap. Please, try again later or contact support.',
        { reply_markup: retryButton, parse_mode: 'HTML' },
      );

      return;
    } else {
      await ctx.reply('Failed to burn inappropriate boosted claim cap. Please, try again later or contact support.', {
        reply_markup: retryButton,
      });

      return;
    }

    const createdSuccessfully = await createBoostedClaimCap({
      conversation,
      ctx,
      retryButton,
    });

    if (!createdSuccessfully) {
      return;
    }

    boostedClaimCap = await getBoostedClaimCap({
      conversation,
      refundManager,
    });
  }

  if (boostedClaimCap === undefined || boostedClaimCap.boostedClaimCapObjectId === null) {
    await ctx.reply(`Failed to prepare the <b>boosted claim</b>. Please, try again or contact support.`, {
      reply_markup: retryButton,
      parse_mode: 'HTML',
    });

    return;
  }

  boostedClaimCapObjectId = boostedClaimCap.boostedClaimCapObjectId;

  await ctx.reply('<b>Claiming the boosted refund...</b>', {
    parse_mode: 'HTML',
  });

  // Create transaction to claim refund
  const transaction = await getTransactionFromMethod({
    conversation,
    ctx,
    method: RefundManagerSingleton.getClaimRefundBoostedTransaction,
    params: {
      userRinbotRefundDestinationAddress: conversation.session.refund.boostedRefundAccount.publicKey,
      boostedClaimCap: boostedClaimCapObjectId,
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

  if (result.result === TransactionResultStatus.Success && result.digest !== undefined) {
    // Switch to the new wallet
    conversation.session.publicKey = conversation.session.refund.boostedRefundAccount.publicKey;
    conversation.session.privateKey = conversation.session.refund.boostedRefundAccount.privateKey;
    conversation.session.refund.claimedBoostedRefund = true;
    conversation.session.refund.boostedRefundAmount = boostedRefundAmount;

    await ctx.reply(
      `<b>Boosted refund</b> has been <a href="${getSuiVisionTransactionLink(result.digest)}">` +
        `successfully claimed</a>!\n\n` +
        `You have been switched to the account containing the boosted refund funds.\nEnjoy trading with us! 🎉🚀`,
      {
        reply_markup: assetsWithHomeKeyboard,
        parse_mode: 'HTML',
      },
    );

    return;
  }

  if (result.result === TransactionResultStatus.Failure && result.digest !== undefined) {
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

async function createBoostedClaimCap({
  conversation,
  ctx,
  retryButton,
}: {
  conversation: MyConversation;
  ctx: BotContext;
  retryButton: InlineKeyboard;
}): Promise<boolean> {
  if (conversation.session.refund.boostedRefundAccount === null) {
    await ctx.reply(
      "It's not safe to continue because of unexpected case of dialog scenario. " +
        'Please, try again later or contact support.',
      { reply_markup: refundsKeyboard, parse_mode: 'HTML' },
    );

    return false;
  }

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
      publisherObjectId: RefundManagerSingleton.REFUND_POOL_PUBLISHER_OBJECT_ID,
    },
  });

  if (allowBoostedClaimTransaction === undefined) {
    await ctx.reply(
      'Failed to create transaction for allowing boosted claim. Please, try again later or contact support.',
      { reply_markup: retryButton },
    );

    return false;
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

    return true;
  } else if (
    allowBoostedClaimResult.result === TransactionResultStatus.Failure &&
    allowBoostedClaimResult.digest !== undefined
  ) {
    await ctx.reply(
      `<a href="${getSuiVisionTransactionLink(allowBoostedClaimResult.digest)}">Failed to prepare</a> ` +
        `the <b>boosted claim</b>. Please, try again or contact support.`,
      { reply_markup: retryButton, parse_mode: 'HTML' },
    );

    return false;
  } else {
    await ctx.reply(`Failed to prepare the <b>boosted claim</b>. Please, try again or contact support.`, {
      reply_markup: retryButton,
      parse_mode: 'HTML',
    });

    return false;
  }
}

export async function getBoostedClaimCap({
  conversation,
  refundManager,
  ownerAddress = conversation.session.publicKey,
}: {
  conversation: MyConversation;
  refundManager: RefundManagerSingleton;
  ownerAddress?: string;
}) {
  return await conversation.external(async () => {
    try {
      // We have to make sure that user has `boostedRefundAccount`
      if (conversation.session.refund.boostedRefundAccount === null) {
        return;
      }

      return await refundManager.getBoostedClaimCap({
        ownerAddress,
        newAddress: conversation.session.refund.boostedRefundAccount.publicKey,
      });
    } catch (error) {
      console.error('[claimBoostedRefund] Error while getBoostedClaimCap():', error);

      return;
    }
  });
}
