import BigNumber from 'bignumber.js';
import globalStatsMenu from '../../../../menu/launchpad/surfdog/globalStats';
import { BotContext } from '../../../../types';
import { getSurfdogLaunchpad } from '../getSurfdogLaunchpad';
import { SUI_DECIMALS, testnetSurfdogConfig } from '@avernikoz/rinbot-sui-sdk';

export async function showGlobalStats(ctx: BotContext) {
  const loadingMessage = await ctx.reply('<b>Loading...</b>', {
    parse_mode: 'HTML',
  });

  const surfdog = getSurfdogLaunchpad();
  const globalStats = await surfdog.getGameState();

  const allTickets = globalStats.allTickets.toString();
  const ticketPrice = new BigNumber(globalStats.ticketPrice.toString())
    .dividedBy(10 ** SUI_DECIMALS)
    .toString();
  const tokensPerTicket = new BigNumber(globalStats.tokensPerTicket.toString())
    .dividedBy(
      10 **
        new BigNumber(testnetSurfdogConfig.SURF_DECIMALS.toString()).toNumber(),
    )
    .toFormat();
  const winningTickets = globalStats.winningTickets.toString();
  const generalSuccessRate = new BigNumber(winningTickets)
    .dividedBy(allTickets)
    .multipliedBy(100)
    .toFixed(2);
  const pricePoolBalance = new BigNumber(globalStats.balanceLeft.toString())
    .dividedBy(
      10 **
        new BigNumber(testnetSurfdogConfig.SURF_DECIMALS.toString()).toNumber(),
    )
    .toFormat();

  let globalStatsString = '<b>Global Stats</b>:\n\n';
  globalStatsString += `<b>Ticket price</b>: ${ticketPrice} SUI\n`;
  globalStatsString += `<b>Total tickets played</b>: ${allTickets}\n`;
  globalStatsString += `<b>Total winning tickets</b>: ${winningTickets}\n`;
  globalStatsString += `<b>General success rate</b>: ${generalSuccessRate}%\n`;
  globalStatsString += `<b>Winning ticket value</b>: ${tokensPerTicket} SURF\n`;
  globalStatsString += `<b>Prize Pool Balance</b>: ${pricePoolBalance} SURF`;

  await ctx.api.editMessageText(
    loadingMessage.chat.id,
    loadingMessage.message_id,
    globalStatsString,
    {
      reply_markup: globalStatsMenu,
      parse_mode: 'HTML',
    },
  );
}
