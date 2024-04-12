import { DetailedTurbosOwnedPoolInfo } from '@avernikoz/rinbot-sui-sdk';
import goHome from '../../../inline-keyboards/goHome';
import createTurbosPoolKeyboard from '../../../inline-keyboards/pools/turbos/create-pool';
import { BotContext } from '../../../types';
import { getCoinManager, getTurbos, provider } from '../../sui.functions';
import { getSuiScanCoinLink } from '../../utils';
import { getTurbosPoolUrl } from './utils';

export async function showDetailedPoolsInfo(ctx: BotContext) {
  const homeButtons = goHome.inline_keyboard[0];
  const createPoolWithHomeKeyboard = createTurbosPoolKeyboard
    .clone()
    .row()
    .add(...homeButtons);

  const loadingMessage = await ctx.reply('<b>Loading...</b>', { parse_mode: 'HTML' });

  const turbos = await getTurbos();
  const coinManager = await getCoinManager();
  const ownedPools: DetailedTurbosOwnedPoolInfo[] = await turbos.getDetailedPoolsInfo({
    provider,
    coinManager,
    publicKey: ctx.session.publicKey,
  });

  if (ownedPools.length === 0) {
    await ctx.api.editMessageText(loadingMessage.chat.id, loadingMessage.message_id, 'You have no Turbos pools yet.', {
      reply_markup: createPoolWithHomeKeyboard,
    });

    return;
  }

  let infoString = '💰 <b>Owned Pools</b> 💰';
  ownedPools.forEach((poolInfo) => {
    infoString +=
      `\n\n<b>Name</b>: <a href="${getTurbosPoolUrl(poolInfo.poolId)}">` + `<b>${poolInfo.poolName}</b></a>\n`;
    infoString += `<b>Fee rate</b>: <code>${poolInfo.feePercentage}</code>%\n`;
    infoString += `<b>Tick spacing</b>: <code>${poolInfo.tickSpacing}</code>\n`;
    infoString += `<b>APR</b>: <code>${poolInfo.apr}</code> (<code>${poolInfo.aprPercent}</code>%)\n`;
    infoString += `<b>Fee APR</b>: <code>${poolInfo.feeApr}</code>\n`;
    infoString += `<b>Reward APR</b>: <code>${poolInfo.rewardApr}</code>\n`;
    infoString += `<b>24h Volume</b>: $<code>${poolInfo.volumeFor24hUsd}</code>\n`;
    infoString += `<b>24h Fee</b>: $<code>${poolInfo.feeFor24hUsd}</code>\n`;
    infoString += `<b>Total Liquidity</b>: $<code>${poolInfo.liquidityUsd.toFixed(6)}</code>\n`;
    infoString += '<b>Coins Liquidity</b>:\n';

    const coinSymbolA = poolInfo.coinSymbolA || poolInfo.coinTypeA;
    const coinSymbolB = poolInfo.coinSymbolB || poolInfo.coinTypeB;

    const suiVisionCoinALink = getSuiScanCoinLink(poolInfo.coinTypeA);
    const suiVisionCoinBLink = getSuiScanCoinLink(poolInfo.coinTypeB);

    const rawAmountAString = poolInfo.amountAIsRaw ? ` <i>(*raw)</i>` : '';
    const rawAmountBString = poolInfo.amountBIsRaw ? ` <i>(*raw)</i>` : '';

    infoString +=
      `<a href='${suiVisionCoinALink}'>${coinSymbolA}</a>: <code>${poolInfo.amountA}</code> ` +
      `($<code>${poolInfo.coinLiquidityUsdA.toFixed(6)}</code>)${rawAmountAString}\n`;
    infoString +=
      `<a href='${suiVisionCoinBLink}'>${coinSymbolB}</a>: <code>${poolInfo.amountB}</code> ` +
      `($<code>${poolInfo.coinLiquidityUsdB.toFixed(6)}</code>)${rawAmountBString}\n`;
  });

  const someAmountIsRaw = ownedPools.some((poolInfo) => poolInfo.amountAIsRaw || poolInfo.amountBIsRaw);

  if (someAmountIsRaw) {
    infoString += "\n\n<i>*raw</i> &#8213; amount doesn't respect decimals.";
  }

  await ctx.api.editMessageText(loadingMessage.chat.id, loadingMessage.message_id, infoString, {
    reply_markup: createPoolWithHomeKeyboard,
    parse_mode: 'HTML',
    link_preview_options: { is_disabled: true },
  });
}
