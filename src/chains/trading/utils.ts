import {
  LONG_SUI_COIN_TYPE,
  RouteManager,
  SHORT_SUI_COIN_TYPE,
  isSuiCoinType,
  transactionFromSerializedTransaction,
} from '@avernikoz/rinbot-sui-sdk';
import BigNumber from 'bignumber.js';
import confirmWithCloseKeyboard from '../../inline-keyboards/mixed/confirm-with-close';
import { BotContext, MyConversation } from '../../types';
import { SUI_COIN_DATA } from '../sui.config';
import { getCoinManager, getRouteManager, randomUuid } from '../sui.functions';
import { getCoinPrice } from '../utils';
import { SwapSide } from './types';

export async function printSwapInfo({
  ctx,
  conversation,
  formattedInputAmount,
  outputAmount,
  providerName,
  side,
}: {
  ctx: BotContext;
  conversation: MyConversation;
  formattedInputAmount: string;
  outputAmount: bigint;
  providerName: string;
  side: SwapSide;
}) {
  const userShouldConfirmSwap = conversation.session.settings.swapWithConfirmation;
  const coinManager = await getCoinManager();

  const inputCoinType = side === SwapSide.Buy ? SHORT_SUI_COIN_TYPE : conversation.session.tradeCoin.coinType;
  const outputCoinType = side === SwapSide.Buy ? conversation.session.tradeCoin.coinType : SHORT_SUI_COIN_TYPE;

  const inputCoinData = await conversation.external(() => coinManager.getCoinByType2(inputCoinType));
  const outputCoinData = isSuiCoinType(outputCoinType)
    ? SUI_COIN_DATA
    : await conversation.external(() => coinManager.getCoinByType2(outputCoinType));

  const outputAmountIsRaw = outputCoinData === null;
  const outputCoinDecimals = outputAmountIsRaw ? 0 : outputCoinData.decimals;

  const formattedOutputAmount = new BigNumber(outputAmount.toString()).div(10 ** outputCoinDecimals).toString();

  const inputCoinSymbol = inputCoinData?.symbol?.toUpperCase() ?? inputCoinType;
  const outputCoinSymbol = outputCoinData?.symbol?.toUpperCase() ?? outputCoinType;

  const coinTypeToPrintPrice = side === SwapSide.Buy ? outputCoinType : inputCoinType;
  const coinSymbolToPrintPrice = side === SwapSide.Buy ? outputCoinSymbol : inputCoinSymbol;

  // Getting offchain price part
  const offchainPrice = await conversation.external(() => getCoinPrice(coinTypeToPrintPrice));
  const offchainPriceString =
    offchainPrice !== null
      ? `Current offchain <b>${coinSymbolToPrintPrice}</b> price: $<code>${offchainPrice}</code>\n`
      : '';

  // Getting calculated from swap price part
  let calculatedPriceString = '';
  let calculatedPrice: string | null = null;

  if (!outputAmountIsRaw) {
    const suiPrice = await conversation.external(() => getCoinPrice(LONG_SUI_COIN_TYPE));

    if (suiPrice !== null) {
      if (side === SwapSide.Buy) {
        const outputCoinPriceInInputCoin = new BigNumber(formattedInputAmount).div(formattedOutputAmount);
        const outputCoinPriceInUsd = outputCoinPriceInInputCoin.multipliedBy(suiPrice).toFixed(9);

        calculatedPrice = outputCoinPriceInUsd;
      } else {
        const inputCoinPriceInOutputCoin = new BigNumber(formattedOutputAmount).div(formattedInputAmount);
        const inputCoinPriceInUsd = inputCoinPriceInOutputCoin.multipliedBy(suiPrice).toFixed(9);

        calculatedPrice = inputCoinPriceInUsd;
      }

      calculatedPriceString = `Current swap <b>${coinSymbolToPrintPrice}</b> price: $<code>${calculatedPrice}</code>\n`;
    }
  }

  // Getting prices difference part
  let pricesDifferenceString = '';

  if (offchainPrice !== null && calculatedPrice !== null) {
    const priceDifference = new BigNumber(offchainPrice).minus(calculatedPrice).abs().toFixed(9);
    pricesDifferenceString = `Difference in prices: $<code>${priceDifference}</code>\n`;
  }

  // Getting action part
  let actionPartString = '';

  if (userShouldConfirmSwap) {
    actionPartString = `You are going to ${side}`;
  } else {
    actionPartString = side === SwapSide.Buy ? 'You are buying' : 'You are selling';
  }

  const rawOutputAmountString = outputAmountIsRaw ? ` <i>(*raw)</i>` : '';

  // Constructing result message
  let message =
    side === SwapSide.Buy
      ? `${actionPartString} <code>${formattedOutputAmount}</code>${rawOutputAmountString} ` +
        `<b>${outputCoinSymbol}</b> for <code>${formattedInputAmount}</code> <b>${inputCoinSymbol}</b> ` +
        `using <b><i>${providerName}</i></b> liquidity provider.\n\n`
      : `${actionPartString} <code>${formattedInputAmount}</code> <b>${inputCoinSymbol}</b> for ` +
        `<code>${formattedOutputAmount}</code>${rawOutputAmountString} <b>${outputCoinSymbol}</b> ` +
        `using <b><i>${providerName}</i></b> liquidity provider.\n\n`;

  // Adding prices strings after general swap info
  const pricesString = offchainPriceString + calculatedPriceString + pricesDifferenceString;

  if (pricesString !== '') {
    message += pricesString + '\n';
  }

  // Adding hint and note if user should confirm the swap
  message += userShouldConfirmSwap
    ? `<span class="tg-spoiler"><b>Hint</b>: you can switch <b><i>Swap Confirmation</i></b> in ` +
      `<b><i>Settings</i></b>.\n\n<b>Note</b>: you should confirm your swap within 15 seconds. ` +
      `Otherwise, swap could be failed due to price changes.</span>\n\n`
    : '';

  if (outputAmountIsRaw) {
    message += "<i>*raw</i> — amount doesn't respect decimals.";
  }

  await ctx.reply(message, {
    parse_mode: 'HTML',
    reply_markup: userShouldConfirmSwap ? confirmWithCloseKeyboard : undefined,
  });
}

export async function getBestRouteTransactionDataWithExternal({
  conversation,
  ctx,
  methodParams,
}: {
  conversation: MyConversation;
  ctx: BotContext;
  methodParams: Parameters<RouteManager['getBestRouteTransaction']>[0];
}) {
  const routerManager = await getRouteManager();

  return await conversation.external({
    task: async () => {
      try {
        return await routerManager.getBestRouteTransaction(methodParams);
      } catch (e) {
        if (e instanceof Error) {
          console.error(`[instantBuy] failed to create transaction: ${e.message}`);
        } else {
          console.error(`[instantBuy] failed to create transaction: ${e}`);
        }

        return;
      }
    },
    beforeStore: (value) => {
      if (value) {
        return {
          tx: value.tx.serialize(),
          outputAmount: value.outputAmount.toString(),
          providerName: value.providerName,
        };
      }
    },
    afterLoad: async (value) => {
      if (value) {
        return {
          tx: transactionFromSerializedTransaction(value.tx),
          outputAmount: BigInt(value.outputAmount),
          providerName: value.providerName,
        };
      }
    },
    afterLoadError: async (error) => {
      console.debug(`[instantBuy]: Error in afterLoadError for ${ctx.from?.username} and instance ${randomUuid}`);
      console.error(error);
    },
    beforeStoreError: async (error) => {
      console.debug(`[instantBuy] Error in beforeStoreError for ${ctx.from?.username} and instance ${randomUuid}`);
      console.error(error);
    },
  });
}
