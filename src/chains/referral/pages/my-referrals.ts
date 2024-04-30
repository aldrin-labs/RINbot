import BigNumber from 'bignumber.js';
import shareMyReferralLinkMenu from '../../../menu/referral/share-link';
import { BotContext } from '../../../types';
import { CoinAmount, CoinType } from '../../types';
import { getReferralsTrades, getUserReferrals } from '../redis/utils';
import { ReferralTradeData } from '../types';
import { getCoinManager } from '../../sui.functions';
import { LONG_SUI_COIN_TYPE, isSuiCoinType } from '@avernikoz/rinbot-sui-sdk';

export async function showMyReferralsPage(ctx: BotContext) {
  const loadingMessage = await ctx.reply('<b>Loading...</b>', { parse_mode: 'HTML' });

  const userReferrals = await getUserReferrals(ctx.session.referral.referralId);
  const referralTrades: ReferralTradeData[] = await getReferralsTrades(ctx.session.referral.referralId);

  console.debug('referralTrades:', referralTrades);

  if (userReferrals.length === 0 && referralTrades.length === 0) {
    await ctx.api.editMessageText(loadingMessage.chat.id, loadingMessage.message_id, '✏ You have no referrals yet.', {
      reply_markup: shareMyReferralLinkMenu,
    });

    return;
  }

  let refString = '💰 <b>My Referrals</b> 💰\n\n';

  userReferrals.forEach((refId) => {
    refString += `<b>Referral id</b>: <code>${refId}</code>\n`;
  });

  if (referralTrades.length === 0) {
    await ctx.api.editMessageText(loadingMessage.chat.id, loadingMessage.message_id, refString, {
      reply_markup: shareMyReferralLinkMenu,
      parse_mode: 'HTML',
    });

    return;
  }

  const feesEarnedSummary = referralTrades.reduce((map, tradeData) => {
    const { feeAmount, feeCoinType } = tradeData;
    const coinType = isSuiCoinType(feeCoinType) ? LONG_SUI_COIN_TYPE : feeCoinType;
    const coinAmount = map.get(coinType);

    const newAmount = coinAmount !== undefined ? new BigNumber(coinAmount).plus(feeAmount).toString() : feeAmount;
    map.set(coinType, newAmount);

    return map;
  }, new Map<CoinType, CoinAmount>());

  if (userReferrals.length === 0) {
    refString = '✏ You have no referrals now.\n';
  }

  refString += '\n💵  <b>Fees earned</b>:\n';

  const coinManager = await getCoinManager();
  let someAmountIsRaw = false;

  for (const [coinType, coinAmount] of feesEarnedSummary) {
    const coinData = await coinManager.getCoinByType2(coinType);

    if (coinData === null) {
      refString += `<b>${coinType}</b>: <code>${coinAmount}</code> <i>(*raw)</i>\n\n`;
      someAmountIsRaw = true;

      continue;
    }

    const { decimals, symbol } = coinData;
    const formattedAmount = new BigNumber(coinAmount).div(10 ** decimals).toString();
    const coinSymbol = symbol?.toUpperCase() ?? coinType;

    refString += `<b>${coinSymbol}</b>: <code>${formattedAmount}</code>\n`;
  }

  if (someAmountIsRaw) {
    refString += "<i>*raw</i> — amount doesn't respect decimals.";
  }

  await ctx.api.editMessageText(loadingMessage.chat.id, loadingMessage.message_id, refString, {
    reply_markup: shareMyReferralLinkMenu,
    parse_mode: 'HTML',
  });
}
