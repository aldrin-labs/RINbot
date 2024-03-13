import { CoinAssetData } from "@avernikoz/rinbot-sui-sdk";
import axios from "axios";
import { AxiosPriceApiResponsePost, AxiosPriceApiResponseGet, CoinAssetDataExtended, PriceApiPayload } from "../types";

export function calculate(balance: string, price: number | undefined){
    if(price === undefined)
        return null
    const result = +balance * price;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(result);
}

export function totalBalanceCalculation(balance: string, price: number | undefined) {
    if(price === undefined)
        return 0
    return +balance * price
}

export const isCoinAssetDataExtended = (asset: any): asset is CoinAssetDataExtended => 'price' in asset; 

export async function postPriceApi(allCoinsAssets: CoinAssetData[]){
    try {
        let data: PriceApiPayload = {data: []}
        allCoinsAssets.forEach(coin => {
            data.data.push({chainId: "sui", tokenAddress: coin.type})
          })
          const response = await axios.post<AxiosPriceApiResponsePost>("https://price-api-eight.vercel.app/assets", data)
        return response
    } catch (error) {
        console.error('Price API error: ',error);
        return undefined
    }
}

export async function getPriceApi(chainId: string, tokenAddress: string){
    try {
        const response = await axios.get<AxiosPriceApiResponseGet>("https://price-api-eight.vercel.app/api/assets", {
            params: {
                chainId,
                tokenAddress
            }
        })
        
        return response
    } catch (error) {
        console.error('Price API error: ',error);
        return undefined
    }
}