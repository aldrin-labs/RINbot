import BigNumber from 'bignumber.js';
import { getTurbos } from '../../sui.functions';
import { TurbosSingleton } from '@avernikoz/rinbot-sui-sdk';

export async function getTurbosFeeRatesString() {
  const turbos = await getTurbos();
  const fees = await turbos.getFees();

  let feeRatesString = '';

  fees.forEach((feeObject) => {
    const feePercentage = new BigNumber(feeObject.fee).div(TurbosSingleton.FEE_DIVIDER);

    feeRatesString += `\n${feeObject.tickSpacing}\t\t—\t\t${feePercentage}%`;
  });

  return feeRatesString;
}

export function getTurbosPoolUrl(poolId: string) {
  return `https://app.turbos.finance/#/pools/${poolId}/add-liquidity`;
}
