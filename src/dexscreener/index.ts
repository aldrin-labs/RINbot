import { SuiDexscreenerEndpoints } from './config'
import axios from "axios";

//Get one or multiple pairs by chain and pair address
export async function getPairsByChainIdAndPairAddress(chainId: string, pairAddresses: string[]) {
    let request = SuiDexscreenerEndpoints.pairs + chainId + "/"
    pairAddresses.forEach(address => {
        request += `,${address}`
    })
    const response = await axios.get(request)
    return response
}

//Get one or multiple pairs by token addresses
export async function getPairsByTokenAddress(pairAddresses: string[]) {

    let request = SuiDexscreenerEndpoints.tokens
    pairAddresses.forEach(address => {
        request += `,${address}` 
    })

    const response = await axios.get(request)
    return response;
    
}


//Search for pairs matching query
export async function searchPairsByQuery(query: string) {
    const response = await axios.get(SuiDexscreenerEndpoints.query + query)
    return response;
}

