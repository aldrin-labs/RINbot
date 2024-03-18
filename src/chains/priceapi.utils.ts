import { CoinAssetData } from "@avernikoz/rinbot-sui-sdk";
import axios from "axios";
import { AxiosPriceApiResponsePost, AxiosPriceApiResponseGet, CoinAssetDataExtended, PriceApiPayload } from "../types";
import { PRICE_API_URL } from '../config/bot.config'


export function calculate(balance: string, price: number | undefined) {
    if (price === undefined)
        return null
    const result = +balance * price;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(result);
}

export function totalBalanceCalculation(balance: string, price: number | undefined) {
    if (price === undefined)
        return 0
    return +balance * price
}

export const isCoinAssetDataExtended = (asset: any): asset is CoinAssetDataExtended => 'price' in asset;

export async function postPriceApi(allCoinsAssets: CoinAssetData[]) {
    try {
        let data: PriceApiPayload = { data: [] }
        allCoinsAssets.forEach(coin => {
            data.data.push({ chainId: "sui", tokenAddress: coin.type })
        })

        const startTime = Date.now();

        const response = await axios.post<AxiosPriceApiResponsePost>(`${PRICE_API_URL}/assets`, data, { timeout: 1200 })

        const endTime = Date.now();
        const requestTime = endTime - startTime;
        console.log(`Price API post response time: ${requestTime}ms`);
        return response
    } catch (error) {
        console.error('Price API error: ', error);
        return undefined
    }
}

export async function getPriceApi(chainId: string, tokenAddress: string) {
    try {
        const startTime = Date.now();
        const response = await axios.get<AxiosPriceApiResponseGet>(`${PRICE_API_URL}/api/assets`, {
            timeout: 200,
            params: {
                chainId,
                tokenAddress
            }
        })
        const endTime = Date.now();
        const requestTime = endTime - startTime;
        console.log(`Price API get response time: ${requestTime}ms`);
        return response
    } catch (error) {
        console.error('Price API error: ', error);
        return undefined
    }
}