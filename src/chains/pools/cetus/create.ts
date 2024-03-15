import { getPoolObjectIdFromTransactionResult } from "@avernikoz/rinbot-sui-sdk";
import addCetusLiquidityKeyboard from "../../../inline-keyboards/addCetusLiquidity";
import { retryAndGoHomeButtonsData } from "../../../inline-keyboards/retryConversationButtonsFactory";
import { BotContext, MyConversation } from "../../../types";
import { ConversationId } from "../../conversations.config";
import { getTransactionFromMethod, signAndExecuteTransactionAndReturnResult } from "../../conversations.utils";
import { TransactionResultStatus, getCetus, getCoinManager, getWalletManager } from "../../sui.functions";
import { SuiTransactionBlockResponse } from "../../types";
import { getCetusPoolUrl } from "../../utils";
import { askForCoinInPool, askForPoolPrice, askForTickSpacing } from "../utils";

export async function createCetusPool(conversation: MyConversation, ctx: BotContext): Promise<void> {
  const coinManager = await getCoinManager();
  const cetus = await getCetus();
  const allCoinsAssets = await conversation.external(async () => {
    const walletManager = await getWalletManager();
    // TODO: Maybe we should add try/catch here as well
    const coinAssets = await walletManager.getAllCoinAssets(ctx.session.publicKey);

    return coinAssets;
  });
  const retryButton = retryAndGoHomeButtonsData[ConversationId.CreateCetusPool];

  const firstValidatedCoin = await askForCoinInPool({
    conversation,
    ctx,
    coinManager,
    allCoinsAssets,
    retryButton,
    stringifiedNumber: "first",
  });

  // ts check
  if (firstValidatedCoin === undefined) {
    await ctx.reply("Specified coin cannot be found.\n\nPlease, try again and specify another one.", {
      reply_markup: retryButton,
    });

    return;
  }

  const secondValidatedCoin = await askForCoinInPool({
    conversation,
    ctx,
    coinManager,
    allCoinsAssets,
    retryButton,
    stringifiedNumber: "second",
    firstCoinType: firstValidatedCoin.type,
  });

  // ts check
  if (secondValidatedCoin === undefined) {
    await ctx.reply("Specified coin cannot be found.\n\nPlease, try again and specify another one.", {
      reply_markup: retryButton,
    });

    return;
  }

  const poolPrice = await askForPoolPrice({
    conversation,
    ctx,
    firstCoin: firstValidatedCoin,
    secondCoin: secondValidatedCoin,
  });

  // ts check
  if (poolPrice === undefined) {
    await ctx.reply("Specified pool price is not valid.\n\nPlease, try to enter another price or contact support.", {
      reply_markup: retryButton,
    });

    return;
  }

  const tickSpacing = await askForTickSpacing({ conversation, ctx });

  // ts check
  if (tickSpacing === undefined) {
    await ctx.reply("Specified tick spacing is not valid.\n\nPlease, try to enter another one or contact support.", {
      reply_markup: retryButton,
    });

    return;
  }

  await ctx.reply("Finding pool with the same params...");

  const existingPool = await conversation.external(() =>
    cetus.getPoolByCoinTypesAndTickSpacing(firstValidatedCoin.type, secondValidatedCoin.type, tickSpacing),
  );

  if (existingPool !== undefined) {
    await ctx.reply(
      "Unfortunately, pool with params you entered <b>already exists and cannot be created</b>. " +
        "\n\n<b>Info</b>: each pool in Cetus is identified by coins and tick spacing, so you can try to change " +
        "coins or tick spacing, or basically add a liqudity to the existing pool.",
      { reply_markup: retryButton, parse_mode: "HTML" },
    );

    return;
  }

  await ctx.reply("No pool with the same params, so creating...");

  const createPoolTransaction = await getTransactionFromMethod({
    conversation,
    ctx,
    method: cetus.getCreatePoolTransaction.bind(cetus) as typeof cetus.getCreatePoolTransaction,
    params: {
      coinTypeA: firstValidatedCoin.type,
      coinTypeB: secondValidatedCoin.type,
      decimalsA: firstValidatedCoin.decimals,
      decimalsB: secondValidatedCoin.decimals,
      price: poolPrice,
      tickSpacing: +tickSpacing,
    },
  });

  if (!createPoolTransaction) {
    await ctx.reply("Create pool transaction creation failed.", {
      reply_markup: retryButton,
    });

    return;
  }

  const resultOfCreatePool: {
    transactionResult?: SuiTransactionBlockResponse;
    digest?: string;
    resultStatus: TransactionResultStatus;
    reason?: string;
  } = await signAndExecuteTransactionAndReturnResult({
    conversation,
    ctx,
    transaction: createPoolTransaction,
  });

  if (
    resultOfCreatePool.resultStatus === "failure" &&
    resultOfCreatePool.transactionResult &&
    resultOfCreatePool.digest
  ) {
    await ctx.reply(`Pool creation failed.\n\nhttps://suiscan.xyz/mainnet/tx/${resultOfCreatePool.digest}`, {
      reply_markup: retryButton,
    });

    return;
  }

  if (resultOfCreatePool.resultStatus === "failure" && resultOfCreatePool.reason) {
    await ctx.reply("Failed to send transaction for pool creation.", {
      reply_markup: retryButton,
    });

    return;
  }

  const { transactionResult } = resultOfCreatePool;

  // ts check
  if (transactionResult === undefined) {
    await ctx.reply(`Pool creation failed.`, { reply_markup: retryButton });

    return;
  }

  const poolId = getPoolObjectIdFromTransactionResult(transactionResult);

  const retryButtons = retryButton.inline_keyboard[0];
  const addLiquidityWithRetryButtons = addCetusLiquidityKeyboard
    .clone()
    .row()
    .add(...retryButtons);
  await ctx.reply(
    `<a href="${getCetusPoolUrl(poolId)}"><b>Pool</b></a> is successfully created!\n\n` +
      `<b>Pool address</b>: <code>${poolId}</code>\n\n<b>Info</b>: trading on your pool will be ` +
      `available within 5 minutes after adding liquidity to it.`,
    { reply_markup: addLiquidityWithRetryButtons, parse_mode: "HTML" },
  );

  return;
}
