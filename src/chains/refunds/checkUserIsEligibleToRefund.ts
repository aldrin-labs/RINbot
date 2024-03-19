import { SUI_DENOMINATOR } from '@avernikoz/rinbot-sui-sdk';
import BigNumber from 'bignumber.js';
import { promises as fs } from 'fs';
import goHome from '../../inline-keyboards/goHome';
import { BotContext } from '../../types';
import { ConversationId } from '../conversations.config';
import { REFUNDABLE_ACCOUNTS_DATA_JSON_PATH } from './config';

export async function checkUserIsEligibleToRefund(
  ctx: BotContext,
): Promise<void> {
  const checkingMessage = await ctx.reply(
    '<b>Checking your account, it may take some time....</b>',
    {
      parse_mode: 'HTML',
    },
  );

  const data = await fs.readFile(REFUNDABLE_ACCOUNTS_DATA_JSON_PATH, {
    encoding: 'utf-8',
  });

  // TODO: Add typeguard check for data
  const refundableAccounts = JSON.parse(data) as {
    sender: string;
    digest: string;
    amount: string;
  }[];

  const userAccountData = refundableAccounts.find(
    (accountData) => accountData.sender === ctx.session.publicKey,
  );

  const userWasScammed = userAccountData !== undefined;

  if (!userWasScammed) {
    await ctx.api.editMessageText(
      checkingMessage.chat.id,
      checkingMessage.message_id,
      'We have <b>not found any traces of a scam</b> for your account. If you do not agree, please ' +
        'contact the support service.',
      {
        reply_markup: goHome,
        parse_mode: 'HTML',
      },
    );

    return;
  }

  // TODO: Request to check whether user already claimed his funds back
  const userClaimedFunds = false;

  if (userWasScammed && userClaimedFunds) {
    await ctx.api.editMessageText(
      checkingMessage.chat.id,
      checkingMessage.message_id,
      'We found out that this account has <b>already returned the lost funds</b>. If you do not agree, ' +
        'please contact our support.',
      {
        reply_markup: goHome,
        parse_mode: 'HTML',
      },
    );

    return;
  } else if (userWasScammed && !userClaimedFunds) {
    const userRefundableAmount = new BigNumber(
      userAccountData.amount,
    ).dividedBy(SUI_DENOMINATOR);

    await ctx.api.editMessageText(
      checkingMessage.chat.id,
      checkingMessage.message_id,
      `We have found <code>${userRefundableAmount}</code> <b>SUI</b> that was sent to the scam-account.`,
      {
        parse_mode: 'HTML',
      },
    );

    await ctx.conversation.enter(ConversationId.MakeRefund);
  } else {
    await ctx.api.editMessageText(
      checkingMessage.chat.id,
      checkingMessage.message_id,
      'Failed to check whether your account was scammed. Please, try again later or contact support.',
      {
        reply_markup: goHome,
      },
    );

    return;
  }
}
