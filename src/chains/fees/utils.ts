import BigNumber from "bignumber.js";
import { BotContext } from "../../types";
import { RINCEL_COIN_TYPE } from "../sui.config";
import { getWalletManager } from "../sui.functions";
import { findCoinInAssets } from "../utils";
import { DEFAULT_FEE_PERCENTAGE, RINCEL_TO_FEES_MAP } from "./config";

export async function getUserRincelBalance(ctx: BotContext) {
  const walletManager = await getWalletManager();
  const allAssets = await walletManager.getAllCoinAssets(ctx.session.publicKey);
  const foundRincel = findCoinInAssets(allAssets, RINCEL_COIN_TYPE);
  const rincelBalance = foundRincel?.balance ?? "0";

  return rincelBalance;
}

export async function getUserFeePercentage(ctx: BotContext) {
  const rincelBalance = await getUserRincelBalance(ctx);
  const rincelLevel = getRincelLevel(rincelBalance);
  const feePercentage = RINCEL_TO_FEES_MAP.get(rincelLevel);

  return feePercentage ?? DEFAULT_FEE_PERCENTAGE;
}

export function getRincelLevel(balance: string): number {
  const rincelLevels = Array.from(RINCEL_TO_FEES_MAP.keys());
  const rincelLevelsBN = rincelLevels.map((level) => new BigNumber(level));

  let resultLevel: BigNumber = new BigNumber(Math.min(...rincelLevels));

  rincelLevelsBN.forEach((level: BigNumber) => {
    if (level.isLessThanOrEqualTo(balance) && level.isGreaterThan(resultLevel)) {
      resultLevel = level;
    }
  });

  return resultLevel.toNumber();
}
