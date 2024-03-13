import { DCATimescale } from '@avernikoz/rinbot-sui-sdk';
import BigNumber from 'bignumber.js';
import goHome from '../../inline-keyboards/goHome';
import activeDcas from '../../menu/active-dcas';
import { BotContext } from '../../types';
import { getCoinManager } from '../sui.functions';
import { getSuiScanCoinLink } from '../utils';
import { ExtendedDcaObject } from './dca.types';
import { getDCAManager } from './getDCAManager';

export async function showActiveDCAs(ctx: BotContext) {
  const loadingMessage = await ctx.reply('<b>Loading...</b>', {
    parse_mode: 'HTML',
  });

  const coinManager = await getCoinManager();
  const dcaManager = getDCAManager();
  const dcaList = await dcaManager.getDCAsByUser({
    publicKey: ctx.session.publicKey,
  });

  if (dcaList.length === 0) {
    await ctx.api.editMessageText(
      loadingMessage.chat.id,
      loadingMessage.message_id,
      'You have no DCAs yet.',
      { reply_markup: goHome },
    );

    return;
  }

  const dcaObjectsForSession: ExtendedDcaObject[] = [];

  let infoString = '<b>Active DCAs:</b>';
  let i = 1;
  for (const dcaData of dcaList) {
    const baseCoinType = dcaData.fields.base_coin_type;
    const quoteCoinType = dcaData.fields.quote_coin_type;

    const baseCoin = await coinManager.getCoinByType2(baseCoinType);
    const quoteCoin = await coinManager.getCoinByType2(quoteCoinType);

    const baseCoinSymbol = baseCoin?.symbol || baseCoin?.type || baseCoinType;
    const quoteCoinSymbol =
      quoteCoin?.symbol || quoteCoin?.type || quoteCoinType;

    // We use `0` in case there is no base coin decimals to safely print base coin amount without decimals
    const baseCoinDecimals = baseCoin?.decimals ?? 0;

    const extendedDcaData: ExtendedDcaObject = {
      ...dcaData,
      fields: {
        base_coin_symbol: baseCoinSymbol,
        quote_coin_symbol: quoteCoinSymbol,
        base_coin_decimals: baseCoinDecimals,
        ...dcaData.fields,
      },
    };

    dcaObjectsForSession.push(extendedDcaData);

    const dcaDataString = getDcaInfoString(extendedDcaData, i);
    infoString += dcaDataString;
    i++;
  }

  ctx.session.dcas.objects = dcaObjectsForSession;

  await ctx.api.editMessageText(
    loadingMessage.chat.id,
    loadingMessage.message_id,
    infoString,
    {
      reply_markup: activeDcas,
      parse_mode: 'HTML',
    },
  );
}

export function getDcaInfoString(
  dca: ExtendedDcaObject,
  number?: number,
): string {
  const {
    base_coin_type: baseCoinType,
    base_coin_symbol: baseCoinSymbol,
    base_coin_decimals: baseCoinDecimals,
    quote_coin_type: quoteCoinType,
    quote_coin_symbol: quoteCoinSymbol,
    base_balance,
    every,
    time_scale,
    remaining_orders,
    split_allocation,
  } = dca.fields;

  const baseBalance = new BigNumber(base_balance)
    .dividedBy(10 ** baseCoinDecimals)
    .toString();

  const timeAmount = every;
  const timeUnitName = Object.values(DCATimescale)
    [time_scale].toString()
    .toLowerCase();

  const sellPerOrder = new BigNumber(split_allocation)
    .dividedBy(10 ** baseCoinDecimals)
    .toString();

  // TODO: Parse and print `start_time_ms` & `last_time_ms`
  let dcaInfo = number !== undefined ? `\n\n<b>#${number}</b>\n` : `\n\n`;
  dcaInfo += `<b><a href="${getSuiScanCoinLink(baseCoinType)}">${baseCoinSymbol}</a></b> to `;
  dcaInfo += `<b><a href="${getSuiScanCoinLink(quoteCoinType)}">${quoteCoinSymbol}</a></b>\n`;
  dcaInfo += `<b>Remaining ${baseCoinSymbol} balance</b>: <code>${baseBalance}</code> ${baseCoinSymbol}\n`;
  dcaInfo += `<b>Buy every</b>: ${timeAmount} ${timeUnitName}\n`;
  dcaInfo += `<b>Remaining orders</b>: <code>${remaining_orders}</code>\n`;
  dcaInfo += `<b>Sell per order</b>: <code>${sellPerOrder}</code> ${baseCoinSymbol}\n`;

  return dcaInfo;
}
