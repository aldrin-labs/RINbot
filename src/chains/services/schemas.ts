import { z } from 'zod';


export const priceApiResponseSchema = z.object({
    chainId: z.string(),
    tokenAddress: z.string(),
    timestamp: z.number(),
    price: z.number(),
    mcap: z.number(),
    totalVolume: z.number().nullable(), 
    priceChange1h: z.number(),
    priceChange24h: z.number(),
    fecthedFrom: z.enum(['cmc', 'coingecko', 'dexscreener']) 
});