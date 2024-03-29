import { CoinAssetData } from '@avernikoz/rinbot-sui-sdk';
import axios from 'axios';
import {
  AxiosPriceApiResponsePost,
  AxiosPriceApiResponseGet,
  CoinAssetDataExtended,
  PriceApiPayload,
} from '../types';
import { PRICE_API_URL } from '../config/bot.config';
// Import the Redis singleton
import Redis from './redis-priceapi';

export function calculate(balance: string, price: number | undefined) {
  if (price === undefined) return null;
  const result = +balance * price;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(result);
}

export function totalBalanceCalculation(
  balance: string,
  price: number | undefined,
) {
  if (price === undefined) return 0;
  return +balance * price;
}

export function formatTokenInfo(token: CoinAssetDataExtended): string {
  if (calculate(token.balance, token.price) === null) {
    return '';
  }

  const tokenPrice = token.price?.toFixed(10);
  const tokenBalance = token.balance;
  const tokenSymbol = token.symbol;
  const tokenValueInUSD = calculate(token.balance, token.price);
  const mcapInUSD = token.mcap === 0 ? '' : calculate('1', token.mcap);
  const priceChange1h =
    token.priceChange1h === 0
      ? token.priceChange1h.toFixed(2)
      : (token.priceChange1h! > 0
          ? '+' + token.priceChange1h?.toFixed(2)
          : token.priceChange1h?.toFixed(2)) + '%';
  const priceChange24h =
    token.priceChange24h === 0
      ? ` ${token.priceChange24h.toFixed(2)}%`
      : (token.priceChange24h! > 0
          ? '+' + token.priceChange24h?.toFixed(2)
          : token.priceChange24h?.toFixed(2)) + '%';

  return `\n\nToken Price: <b>${tokenPrice} USD</b>\nToken Balance: <b>${tokenBalance} ${tokenSymbol} / ${tokenValueInUSD} USD</b>${mcapInUSD ? '\nMcap: <b>' + mcapInUSD + ' USD</b>' : ''}${priceChange1h ? '\n1h: <b>' + priceChange1h + '</b>' : ''}${priceChange24h ? ' 24h: <b>' + priceChange24h + '</b>' : ''}`;
}

export const isCoinAssetDataExtended = (
  asset: any,
): asset is CoinAssetDataExtended => asset && 'price' in asset;

export function hasDefinedPrice(data: unknown) {
  return (
    typeof data === 'object' &&
    data !== null &&
    'price' in data &&
    typeof data.price === 'number'
  );
}

export async function postPriceApi(
  allCoinsAssets: CoinAssetData[],
  useTimeout: boolean = true,
) {
  try {
    let data: PriceApiPayload = { data: [] };
    allCoinsAssets.forEach((coin) => {
      data.data.push({ chainId: 'sui', tokenAddress: coin.type });
    });

    const startTime = Date.now();

    const response = await axios.post<AxiosPriceApiResponsePost>(
      `${PRICE_API_URL}/assets`,
      data,
      { timeout: useTimeout ? 300 : undefined },
    );

    const endTime = Date.now();
    const requestTime = endTime - startTime;
    console.log(`Price API post response time: ${requestTime}ms`);
    return response;
  } catch (error) {
    // console.error('Price API error: ', error);
    return undefined;
  }
}

export async function getPriceApi(chainId: string, tokenAddress: string) {
  try {
    const startTime = Date.now();
    const response = await axios.get<AxiosPriceApiResponseGet>(
      `${PRICE_API_URL}/api/assets`,
      {
        params: {
          chainId,
          tokenAddress,
        },
      },
    );
    const endTime = Date.now();
    const requestTime = endTime - startTime;
    console.log(`Price API get response time: ${requestTime}ms`);
    return response;
  } catch (error) {
    if (error instanceof Error) {
      console.error('Price API error:', error.message);
    } else {
      console.error('Price API error: unknown error');
    }
    return undefined;
  }
}

export function getExtendedWithGetPriceApiResponseDataCoin(
  coin: CoinAssetDataExtended,
  priceApiResponseData: AxiosPriceApiResponseGet['data'],
): CoinAssetDataExtended {
  return {
    ...coin,
    price: priceApiResponseData.price,
    timestamp: Date.now(),
    mcap: priceApiResponseData.mcap || 0,
    priceChange1h: priceApiResponseData.priceChange1h || 0,
    priceChange24h: priceApiResponseData.priceChange24h || 0,
  };
}

// Temporary solution

export async function pullFromPriceAPIdb(allCoinsAssets: CoinAssetData[]) {
  // Initialize the Redis client
  Redis.init();

  const redisClient = Redis.getInstance().getRedisClient();

  const keys = allCoinsAssets.map(async (coinAsset) => {
    try {
      // Fetch the value for each key from Redis
      if (coinAsset.symbol === 'Sui') coinAsset.type = '0x2::sui::SUI';

      const value = await redisClient.get(`sui:${coinAsset.type}`);
      return value; // value could be null if the key doesn't exist in Redis
    } catch (error) {
      console.error(`Error fetching data for ${coinAsset.type}:`, error);
      return null; // Return null in case of an error (or choose another fallback value)
    }
  });

  // Wait for all promises to resolve and collect the results
  const results = await Promise.all(keys);

  return results;
}
