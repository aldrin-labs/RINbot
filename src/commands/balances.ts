import { SHORT_SUI_COIN_TYPE } from '@avernikoz/rinbot-sui-sdk';
import {
  calculate,
  formatTokenInfo,
  getPriceApi,
  isCoinAssetDataExtended,
  postPriceApi,
} from '../chains/priceapi.utils';
import { availableBalance, balance, refreshAssets } from '../chains/sui.functions';
import goHome from '../inline-keyboards/goHome';
import { BotContext, PriceApiPayload } from '../types';

export const balances = async (ctx: BotContext) => {
  const loadingMessage = await ctx.reply('<b>Loading...</b>', {
    parse_mode: 'HTML',
  });

  const userBalance = await balance(ctx);
  const avlBalance = await availableBalance(ctx);
  let price;
  let positionOverview: string = '';
  let totalBalanceStr: string = '';

  try {
    const priceApiGetResponse = await getPriceApi('sui', SHORT_SUI_COIN_TYPE);

    price = priceApiGetResponse?.data.data.price;
  } catch (error) {
    console.error(error);

    price = undefined;
  }
  const balanceUsd = calculate(userBalance, price);
  const avlBalanceUsd = calculate(avlBalance, price);

  try {
    const data: PriceApiPayload = { data: [] };
    const { allCoinsAssets, suiAsset } = await refreshAssets(ctx);

    if (allCoinsAssets?.length === 0) {
      positionOverview = `You don't have tokens yet.`;
    }

    [...allCoinsAssets, suiAsset].forEach((coin) => {
      // Move to price api
      data.data.push({ chainId: 'sui', tokenAddress: coin.type });
    });

    const response = await postPriceApi([...allCoinsAssets, suiAsset], false);
    const coinsPriceApi = response?.data.data;

    const priceMap = new Map(coinsPriceApi!.map((coin) => [coin.tokenAddress, coin.price]));

    let balance = 0;
    [...allCoinsAssets, suiAsset].forEach((coin) => {
      const price = priceMap.get(coin.type);

      if (price !== undefined) {
        balance += +coin.balance * price;
      }
    });

    totalBalanceStr = balance === 0 ? '' : `Your Net Worth: <b>$${balance.toFixed(2)} USD</b>`;

    let assetsString = '';
    for (let index = 0; index < allCoinsAssets.length; index++) {
      const token = allCoinsAssets[index];
      let priceApiDataStr: string;

      if (isCoinAssetDataExtended(token)) {
        priceApiDataStr = formatTokenInfo(token);
      } else {
        priceApiDataStr = '';
      }

      assetsString +=
        `🪙 <a href="https://suiscan.xyz/mainnet/coin/${token.type}/txs">` +
        `${token.symbol}</a>${priceApiDataStr}\n\n`;
    }

    positionOverview = `<b>Your positions:</b> \n\n${assetsString}`;
  } catch (error) {
    console.error('Error in calculating total balance: ', error);
  }

  try {
    const balanceSUIdStr =
      balanceUsd !== null ? `<b>${userBalance} SUI / ${balanceUsd} USD</b>` : `<b>${userBalance} SUI</b>`;

    const avlBalanceSUIdStr =
      avlBalanceUsd !== null ? `<b>${avlBalance} SUI / ${avlBalanceUsd} USD</b>` : `<b>${avlBalance} SUI</b>`;

    const message =
      `Your wallet address: <code>${ctx.session.publicKey}</code>\n\n` +
      `${positionOverview}Your SUI balance: ${balanceSUIdStr}\n` +
      `Your available SUI balance: ${avlBalanceSUIdStr}\n\n${totalBalanceStr}`;

    await ctx.api.editMessageText(loadingMessage.chat.id, loadingMessage.message_id, message, {
      reply_markup: goHome,
      parse_mode: 'HTML',
    });
  } catch (e) {
    console.error(e);
  }
};
