import { AftermathSingleton, CoinAssetData, isSuiCoinType } from "@avernikoz/rinbot-sui-sdk";
import axios from "axios";
import { File, PhotoSize } from "grammy/types";
import { CoinForPool } from "./types";
import { BOT_TOKEN } from "../config/bot.config";
import { getPriceApi } from "./priceapi.utils";

/**
 * Checks if the given string is a valid suiscan link.
 *
 * @param {string} link - The string to be checked.
 * @returns {boolean} - True if the link is valid, false otherwise.
 */
export function isValidCoinLink(link: string): boolean {
  // Regular expression to match valid suiscan links
  const suiscanLinkRegex =
    /^https:\/\/suiscan\.xyz\/mainnet\/coin\/(0x|0X)?[0-9a-fA-F]+::[0-9a-zA-Z]+::[0-9a-zA-Z]+(\/txs|\/|)$/;

  return suiscanLinkRegex.test(link);
}

/**
 * Extracts the coin type from a valid suiscan link.
 *
 * @param {string} link - The valid suiscan link.
 * @returns {string | null} - The extracted coin type or null if extraction fails.
 */
export function extractCoinTypeFromLink(link: string): string | null {
  const suiscanLinkRegex =
    /^https:\/\/suiscan\.xyz\/mainnet\/coin\/0x([0-9a-fA-F]+)::([0-9a-zA-Z]+)::([0-9a-zA-Z]+)(\/txs|\/)?$/;
  const match = link.match(suiscanLinkRegex);

  if (match && match[2]) {
    const coinType = `0x${match[1]}::${match[2]}::${match[3]}`;
    return coinType;
  }

  return null;
}

export const swapTokenTypesAreEqual = (tokenTo: string, tokenFrom: string) => {
  return tokenTo === tokenFrom;
};

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getCurrentTime(): string {
  const now: Date = new Date();
  const timeZoneOffset: number = 3 * 60; // Смещение в минутах для GMT+3
  const utc: number = now.getTime() + now.getTimezoneOffset() * 60000;
  const newDate: Date = new Date(utc + 3600000 * timeZoneOffset);

  const hours: string = String(newDate.getHours()).padStart(2, "0");
  const minutes: string = String(newDate.getMinutes()).padStart(2, "0");
  const seconds: string = String(newDate.getSeconds()).padStart(2, "0");

  return `${hours}:${minutes}:${seconds}`;
}

// TODO: move that util to SDK
type TransactionResult = {
  effects: {
    status: {
      status: string;
    };
  };
  digest: string;
};

const isTransactionResult = (value: unknown): value is TransactionResult => {
  return (
    typeof value === "object" &&
    value !== null &&
    "digest" in value &&
    typeof value.digest === "string" &&
    "effects" in value &&
    typeof value.effects === "object" &&
    value.effects !== null &&
    "status" in value.effects &&
    typeof value.effects.status === "object" &&
    value.effects.status !== null &&
    "status" in value.effects.status &&
    typeof value.effects.status.status === "string"
  );
};

export const isTransactionSuccessful = (transactionResult: unknown): boolean => {
  if (isTransactionResult(transactionResult)) {
    const isSuccess = transactionResult.effects.status.status === "success";

    if (!isSuccess) {
      console.warn(`Transaction ${transactionResult.digest} was not successful.`);
    }

    return isSuccess;
  } else {
    console.warn("Transaction is not in a valid shape.");
    console.warn("Transaction wrong shape: ", transactionResult);

    return false;
  }
};

export function isCoinAssetData(data: unknown): data is CoinAssetData {
  return (
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    typeof data.type === "string" &&
    "balance" in data &&
    typeof data.balance === "string" &&
    "noDecimals" in data &&
    typeof data.noDecimals === "boolean" &&
    "decimals" in data &&
    (typeof data.decimals === "number" || data.decimals === null)
  );
}

export function isCoinForPool(data: unknown): data is CoinForPool {
  return (
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    typeof (data as CoinForPool).type === "string" &&
    "decimals" in data &&
    typeof (data as CoinForPool).decimals === "number" &&
    "balance" in data &&
    typeof (data as CoinForPool).balance === "string"
  );
}

/**
 * The method sorts the image data in ascending order based on their height and then returns the second
 * or the first one, if second data doesn't exist.
 * Telegram's specification dictates that the size of the second image in the sorted order cannot exceed 320x320 pixels,
 * hence it is returned. If the size of the sent image does not exceed 90x90 pixels, there will be only one element
 * in the array, and it will be returned.
 */
export function getSuitableCoinImageData(imagesData: PhotoSize[]): PhotoSize {
  const sortedByHeightImagesData = imagesData.sort((imageA, imageB) => imageA.height - imageB.height);

  return sortedByHeightImagesData[1] || sortedByHeightImagesData[0];
}

/**
 * Extracts file extension from Telegram file-path url or throws an error, where cannot do this.
 * @throws {Error} When cannot extract extension from url.
 * @returns {string} File extension from url.
 */
export function extractFileExtension(url: string): string {
  const parts = url.split("/");
  const fileNameWithExtension = parts[parts.length - 1];
  const fileNameParts = fileNameWithExtension.split(".");

  if (fileNameParts.length > 1) {
    return fileNameParts[fileNameParts.length - 1];
  } else {
    throw new Error(`[extractFileExtension] Cannot extract extension of file in url "${url}"`);
  }
}

/**
 * Fetches an image from given url and converts it to base64 browser readable format.
 */
export async function imageUrlToBase64(url: string): Promise<string> {
  try {
    const response = await axios.get(url, {
      responseType: "arraybuffer",
    });

    const extension = extractFileExtension(url);
    const base64String = Buffer.from(response.data).toString("base64");
    const imageString = `data:image/${extension};base64,${base64String}`;
    return imageString;
  } catch (err) {
    console.error(err);
    throw err;
  }
}

export function getTelegramFileUrl(file: File) {
  const filePath = file.file_path;
  return `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
}

export function getSuiVisionCoinLink(coinType: string) {
  return `https://suivision.xyz/coin/${coinType}`;
}

export function getSuiScanCoinLink(coinType: string) {
  return `https://suiscan.xyz/mainnet/coin/${coinType}`;
}

export function getCetusPoolUrl(poolId: string) {
  return `https://app.cetus.zone/liquidity/deposit?poolAddress=${poolId}`;
}

export function getSuiVisionTransactionLink(digest: string) {
  return `https://suivision.xyz/txblock/${digest}`;
}

export function getAftermathPoolLink(poolObjectId: string) {
  return `${AftermathSingleton.AFTERMATH_POOL_URL}/${poolObjectId}`;
}

export function findCoinInAssets(assets: CoinAssetData[], coinType: string): CoinAssetData | undefined {
  return assets.find((asset) => (isSuiCoinType(asset.type) && isSuiCoinType(coinType)) || asset.type === coinType);
}

// TODO: Pass only coinType as `string`
// TODO: Entire text should depend on the param (e.g. `side`, which is buy or sell)
export async function getPriceOutputData(validCoin: string | CoinAssetData) {
  let price = undefined;
  if (isCoinAssetData(validCoin)) {
    const priceApiGetResponse = await getPriceApi("sui", validCoin.type);
    if (priceApiGetResponse?.data?.data?.price) {
      price = priceApiGetResponse.data.data.price;
      return `You are selling <code>${validCoin.type}</code> for <b>$${price} USD</b> per token\n\n`;
    } else {
      // Handle case where price data is not available but the request did not fail
      return `Price information for <code>${validCoin.type}</code> is currently unavailable.\n\n`;
    }
  } else if (typeof validCoin === "string") {
    const priceApiGetResponse = await getPriceApi("sui", validCoin);
    if (priceApiGetResponse?.data?.data?.price) {
      price = priceApiGetResponse.data.data.price;
      return `You are buying <code>${validCoin}</code> for <b>$${price} USD</b> per token\n\n`;
    } else {
      // Handle case where price data is not available but the request did not fail
      return `Price information for <code>${validCoin}</code> is currently unavailable.\n\n`;
    }
  } else return "Could not fetch the data.\n\n";
}
