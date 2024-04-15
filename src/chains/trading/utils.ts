import { RouteManager, SHORT_SUI_COIN_TYPE, transactionFromSerializedTransaction } from '@avernikoz/rinbot-sui-sdk';
import BigNumber from 'bignumber.js';
import confirmWithCloseKeyboard from '../../inline-keyboards/mixed/confirm-with-close';
import { BotContext, MyConversation } from '../../types';
import { getCoinManager, getRouteManager, randomUuid } from '../sui.functions';
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
  const coinManager = await getCoinManager();

  const inputCoinType = side === SwapSide.Buy ? SHORT_SUI_COIN_TYPE : conversation.session.tradeCoin.coinType;
  const outputCoinType = side === SwapSide.Buy ? conversation.session.tradeCoin.coinType : SHORT_SUI_COIN_TYPE;

  const inputCoinData = await conversation.external(() => coinManager.getCoinByType2(inputCoinType));
  const outputCoinData = await conversation.external(() => coinManager.getCoinByType2(outputCoinType));

  const outputAmountIsRaw = outputCoinData === null;
  const outputCoinDecimals = outputAmountIsRaw ? 0 : outputCoinData.decimals;

  const formattedOutputAmount = new BigNumber(outputAmount.toString()).div(10 ** outputCoinDecimals).toString();

  const inputCoinSymbol = (inputCoinData?.symbol ?? inputCoinType).toUpperCase();
  const outputCoinSymbol = (outputCoinData?.symbol ?? outputCoinType).toUpperCase();

  // TODO: Add prices (offchain and from output amount) print
  // const coinTypeToFetchPrice = side === SwapSide.Buy ? outputCoinType : inputCoinType;
  // const offchainPrice = await conversation.external(() => getCoinPrice(coinTypeToFetchPrice));
  // const offchainPriceString =
  //   offchainPrice !== null ? `Current offchain <b>${outputCoinSymbol}</b> price: $<code>${offchainPrice}</code>\n`
  // : '';

  // const calculatedPrice = side === SwapSide.Buy ? new BigNumber(outputAmount.toString()).div().toString() : ``;

  const userShouldConfirmSwap = conversation.session.settings.swapWithConfirmation;

  let actionPartString = '';

  if (userShouldConfirmSwap) {
    actionPartString = `You are going to ${side}`;
  } else {
    actionPartString = side === SwapSide.Buy ? 'You are buying' : 'You are selling';
  }

  let message =
    side === SwapSide.Buy
      ? `${actionPartString} <code>${formattedOutputAmount}</code> <b>${outputCoinSymbol}</b> for ` +
        `<code>${formattedInputAmount}</code> <b>${inputCoinSymbol}</b> on <b><i>${providerName}</i></b>.\n\n`
      : `${actionPartString} <code>${formattedInputAmount}</code> <b>${inputCoinSymbol}</b> for ` +
        `<code>${formattedOutputAmount}</code> <b>${outputCoinSymbol}</b> on <b><i>${providerName}</i></b>.\n\n`;

  message += userShouldConfirmSwap
    ? `<span class="tg-spoiler"><b>Hint</b>: you can switch <b><i>Swap Confirmation</i></b> in ` +
      `<b><i>Settings</i></b>.\n\n<b>Note</b>: you should confirm your swap within 15 seconds. ` +
      `Otherwise, swap could be failed due to price changes.</span>`
    : '';

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
