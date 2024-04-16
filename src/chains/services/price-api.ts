import { Axios } from "axios";
import { PriceApiResponse } from "./types";
import { priceApiResponseSchema } from "./schemas";
import { LONG_SUI_COIN_TYPE, SHORT_SUI_COIN_TYPE } from "@avernikoz/rinbot-sui-sdk";

export interface PriceApiProps {
    axios: Axios,
    apiKey: string,
    url: string
}
type AggregatedResult = Record<string, PriceApiResponse | null>;

export class PriceApiClient {
    static _instance: PriceApiClient | undefined;
    axios: Axios;

  private constructor(private props: PriceApiProps) {
    this.axios = props.axios;
  }

  static getInstance(props?: PriceApiProps): PriceApiClient {
    if(!this._instance && props) {
        this._instance = new PriceApiClient(props);
    }
    if(!this._instance) {
        throw new Error('The Price Api Client has never been instanciated with his properties');
    }
    return this._instance;
  }

  async getPrices(tokens: {chainId: string, tokenAddress: string}[]): Promise<AggregatedResult> {
    const promises = tokens.map(token =>
        this.getPrice(token.chainId, token.tokenAddress)
            .then(response => ({ [token.tokenAddress]: response }))
            .catch(error => {
                console.error('Failed to fetch price for:', token.tokenAddress, error);
                return { [token.tokenAddress]: null};
            })
    );
    const results = await Promise.all(promises);
    return results.reduce((acc: AggregatedResult, result) => ({ ...acc, ...result }), {});
  }


  async getPrice(chainId: string, tokenAddress: string): Promise<PriceApiResponse> {
    if(tokenAddress === LONG_SUI_COIN_TYPE) tokenAddress = SHORT_SUI_COIN_TYPE;
    const startTime = Date.now();
    const response = await this.axios.get(`${this.props.url}/prices`, {
        params: {
            chainId,
            tokenAddress
        },
        headers: {
            'x-api-key': this.props.apiKey
        }
    });
    const endTime = Date.now();
    const requestTime = endTime - startTime;
    console.log(`Price API get response time: ${requestTime}ms`);
    
    return priceApiResponseSchema.parse(response.data);
  }
  
}