import { testnetSurfdogConfig } from '@avernikoz/rinbot-sui-sdk';
import BigNumber from 'bignumber.js';
import userTicketsMenu from '../../../../menu/launchpad/surfdog/userTickets';
import { BotContext } from '../../../../types';
import { getSurfdogLaunchpad } from '../getSurfdogLaunchpad';

export async function showUserTickets(ctx: BotContext) {
  const loadingMessage = await ctx.reply('<b>Loading...</b>', {
    parse_mode: 'HTML',
  });

  const surfdog = getSurfdogLaunchpad();
  const userTickets = await surfdog.getUserState(ctx.session.publicKey);

  if (userTickets === null) {
    await ctx.api.editMessageText(
      loadingMessage.chat.id,
      loadingMessage.message_id,
      'You have no tickets yet.',
      {
        reply_markup: userTicketsMenu,
      },
    );

    return;
  }

  const globalStats = await surfdog.getGameState();

  const tokensPerTicket = new BigNumber(
    globalStats.tokensPerTicket.toString(),
  ).dividedBy(
    10 **
      new BigNumber(testnetSurfdogConfig.SURF_DECIMALS.toString()).toNumber(),
  );
  const allTickets = userTickets.allTickets.toString();
  const wonTickets = userTickets.allTickets.toString();
  const successRate = new BigNumber(wonTickets)
    .dividedBy(allTickets)
    .multipliedBy(100)
    .toFixed(2);
  const wonPrize = tokensPerTicket.multipliedBy(wonTickets).toFormat();

  let userTicketsString = `<b>Your Tickets</b>:\n\n`;
  userTicketsString += `<b>Bought tickets</b>: ${allTickets}\n`;
  userTicketsString += `<b>Winning tickets</b>: ${wonTickets}\n`;
  userTicketsString += `<b>Success rate</b>: ${successRate}%\n`;
  userTicketsString += `<b>Won prize</b>: ${wonPrize} SURF`;

  await ctx.api.editMessageText(
    loadingMessage.chat.id,
    loadingMessage.message_id,
    userTicketsString,
    {
      reply_markup: userTicketsMenu,
      parse_mode: 'HTML',
    },
  );
}
