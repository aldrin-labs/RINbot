import goHome from '../../../inline-keyboards/goHome';
import { BotContext } from '../../../types';
import { getCetus, getCoinManager, provider } from '../../sui.functions';
import { getCetusPoolUrl, getSuiVisionCoinLink } from '../../utils';

export async function ownedCetusPools(ctx: BotContext): Promise<void> {
  const loadingMessage = await ctx.reply('<b>Loading...</b>', {
    parse_mode: 'HTML',
  });

  const coinManager = await getCoinManager();
  const cetus = await getCetus();
  const ownedPoolInfos = await cetus.getOwnedPools(
    provider,
    ctx.session.publicKey,
    coinManager,
  );

  if (ownedPoolInfos.length === 0) {
    await ctx.reply('You have no pools yet.', { reply_markup: goHome });

    return;
  }

  let infoString = '<b>Owned Pools</b>:';
  ownedPoolInfos.forEach((poolInfo) => {
    infoString +=
      `\n\nName: <a href="${getCetusPoolUrl(poolInfo.poolAddress)}">` +
      `<b>${poolInfo.name}</b></a>\n`;
    infoString += `Pool address: <code>${poolInfo.poolAddress}</code>\n`;
    infoString += `Fee rate: <code>${poolInfo.feeRate}%</code>\n`;
    infoString += 'Liquidity:\n';

    const suiVisionCoinALink = getSuiVisionCoinLink(poolInfo.coinTypeA);
    const suiVisionCoinBLink = getSuiVisionCoinLink(poolInfo.coinTypeB);

    const rawAmountAString = poolInfo.amountAIsRaw ? ` <i>(*raw)</i>` : '';
    const rawAmountBString = poolInfo.amountBIsRaw ? ` <i>(*raw)</i>` : '';

    infoString +=
      `<a href='${suiVisionCoinALink}'>${poolInfo.coinSymbolA || poolInfo.coinTypeA}</a>: ` +
      `<code>${poolInfo.amountA}</code>${rawAmountAString}\n`;
    infoString +=
      `<a href='${suiVisionCoinBLink}'>${poolInfo.coinSymbolB || poolInfo.coinTypeB}</a>: ` +
      `<code>${poolInfo.amountB}</code>${rawAmountBString}`;
  });

  const someAmountIsRaw = ownedPoolInfos.some(
    (poolInfo) => poolInfo.amountAIsRaw || poolInfo.amountBIsRaw,
  );

  if (someAmountIsRaw) {
    infoString += "\n\n<i>*raw</i> &#8213; amount doesn't respect decimals.";
  }

  await ctx.api.editMessageText(
    loadingMessage.chat.id,
    loadingMessage.message_id,
    infoString,
    {
      reply_markup: goHome,
      parse_mode: 'HTML',
    },
  );
}
