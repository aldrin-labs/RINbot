import { calculate, formatTokenInfo, getPriceApi, isCoinAssetDataExtended, postPriceApi } from "../chains/priceapi.utils";
import { availableBalance, balance, refreshAssets } from "../chains/sui.functions";
import { BotContext, MyConversation, PriceApiPayload } from "../types";

export const balances = async (conversation: MyConversation, ctx: BotContext) => {
    const userBalance = await balance(ctx);
  const avl_balance = await availableBalance(ctx);
  let price;
  let positionOverview: string;

  try {
    const priceApiGetResponse = await getPriceApi('sui', '0x2::sui::SUI')
    price = priceApiGetResponse?.data.data.price
  } catch (error) {
    console.error(error)
    price = undefined
  }
  const balance_usd = calculate(userBalance, price)
  const avl_balance_usd = calculate(avl_balance, price)

  let totalBalanceStr: string;

  try {
    const data: PriceApiPayload = { data: [] }
    const {allCoinsAssets, suiAsset} = await refreshAssets(ctx);
    [...allCoinsAssets, suiAsset].forEach(coin => {
      //move to price api
      data.data.push({ chainId: "sui", tokenAddress: coin.type })
    })

    const response = await postPriceApi([...allCoinsAssets, suiAsset]);

    const coinsPriceApi = response?.data.data;

    const priceMap = new Map(coinsPriceApi!.map(coin => [coin.tokenAddress, coin.price]));

    let balance = 0;
    [...allCoinsAssets, suiAsset].forEach(coin => {
      const price = priceMap.get(coin.type);
      if (price !== undefined) {
        balance += +coin.balance * price;
      }
    });

    totalBalanceStr = `Your Net Worth: <b>$${balance.toFixed(2)} USD</b>`;

  } catch (error) {
    console.error('Error in calculating total balance: ', error)
    totalBalanceStr = ``
  }

  try {
    const {allCoinsAssets} = await refreshAssets(ctx);
    if (allCoinsAssets?.length === 0) {
      positionOverview = `You don't have tokens yet.`
    }
    let assetsString = '';
    for (let index = 0; index < allCoinsAssets.length; index++) {
      const token = allCoinsAssets[index];
      let priceApiDataStr: string;
      if (isCoinAssetDataExtended(token)) {
        priceApiDataStr = formatTokenInfo(token)
      } else {
        priceApiDataStr = '';
      }

      assetsString += `🪙<a href="https://suiscan.xyz/mainnet/coin/${token.type}/txs">${token.symbol}</a>${priceApiDataStr}\n\n`;
    }
    positionOverview = `\n\n<b>Your positions:</b> \n\n${assetsString}`;
  } catch (e) {
    console.error(e)
    positionOverview = ''
  }
  try {
    const balanceSUIdStr = balance_usd !== null ? `<b>${userBalance} SUI / ${balance_usd} USD</b>` : `<b>${userBalance} SUI</b>`
    const avlBalanceSUIdStr = avl_balance_usd !== null ? `<b>${avl_balance} SUI / ${avl_balance_usd} USD</b>` : `<b>${avl_balance} SUI</b>`
    const message = `Your wallet address: <code>${ctx.session.publicKey}</code>${positionOverview}Your SUI balance: ${balanceSUIdStr}\nYour available SUI balance: ${avlBalanceSUIdStr}\n\n${totalBalanceStr}`;
    await ctx.reply(message, { parse_mode: 'HTML' });
  }catch(e) {
    console.error(e);
  }
}