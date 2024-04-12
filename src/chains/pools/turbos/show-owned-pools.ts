import { TurbosOwnedPool } from '@avernikoz/rinbot-sui-sdk';
import goHome from '../../../inline-keyboards/goHome';
import createTurbosPoolKeyboard from '../../../inline-keyboards/pools/turbos/create-pool';
import loadDetailedPoolsInfoKeyboard from '../../../inline-keyboards/pools/turbos/load-detailed-pools-info';
import { BotContext } from '../../../types';
import { getCoinManager, getTurbos, provider } from '../../sui.functions';
import { getSuiScanCoinLink } from '../../utils';
import { getTurbosPoolUrl } from './utils';

export async function showOwnedTurbosPools(ctx: BotContext) {
  const homeButtons = goHome.inline_keyboard[0];
  const createPoolButtons = createTurbosPoolKeyboard.inline_keyboard[0];
  const createPoolWithHomeKeyboard = createTurbosPoolKeyboard
    .clone()
    .row()
    .add(...homeButtons);
  const loadDetailedPoolsInfoWithHomeAndCreatePoolKeyboard = loadDetailedPoolsInfoKeyboard
    .clone()
    .row()
    .add(...homeButtons)
    .add(...createPoolButtons);

  const loadingMessage = await ctx.reply('<b>Loading...</b>', { parse_mode: 'HTML' });

  const turbos = await getTurbos();
  const coinManager = await getCoinManager();
  const ownedPools: TurbosOwnedPool[] = await turbos.getOwnedPools({
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
    infoString += '<b>Liquidity</b>:\n';

    const suiVisionCoinALink = getSuiScanCoinLink(poolInfo.coinTypeA);
    const suiVisionCoinBLink = getSuiScanCoinLink(poolInfo.coinTypeB);

    const rawAmountAString = poolInfo.amountAIsRaw ? ` <i>(*raw)</i>` : '';
    const rawAmountBString = poolInfo.amountBIsRaw ? ` <i>(*raw)</i>` : '';

    infoString +=
      `<a href='${suiVisionCoinALink}'>${poolInfo.coinSymbolA || poolInfo.coinTypeA}</a>: ` +
      `<code>${poolInfo.amountA}</code>${rawAmountAString}\n`;
    infoString +=
      `<a href='${suiVisionCoinBLink}'>${poolInfo.coinSymbolB || poolInfo.coinTypeB}</a>: ` +
      `<code>${poolInfo.amountB}</code>${rawAmountBString}`;
  });

  const someAmountIsRaw = ownedPools.some((poolInfo) => poolInfo.amountAIsRaw || poolInfo.amountBIsRaw);

  if (someAmountIsRaw) {
    infoString += "\n\n<i>*raw</i> &#8213; amount doesn't respect decimals.";
  }

  await ctx.api.editMessageText(loadingMessage.chat.id, loadingMessage.message_id, infoString, {
    reply_markup: loadDetailedPoolsInfoWithHomeAndCreatePoolKeyboard,
    parse_mode: 'HTML',
    link_preview_options: { is_disabled: true },
  });
}
