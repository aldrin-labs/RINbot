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
  const utc: number = now.getTime() + (now.getTimezoneOffset() * 60000);
  const newDate: Date = new Date(utc + (3600000 * timeZoneOffset));

  const hours: string = String(newDate.getHours()).padStart(2, '0');
  const minutes: string = String(newDate.getMinutes()).padStart(2, '0');
  const seconds: string = String(newDate.getSeconds()).padStart(2, '0');

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
    typeof value === 'object' &&
    value !== null &&
    "digest" in value &&
    typeof value.digest === 'string' && 
    'effects' in value &&
    typeof value.effects === 'object' &&
    value.effects !== null &&
    'status' in value.effects &&
    typeof value.effects.status === 'object' &&
    value.effects.status !== null &&
    'status' in value.effects.status &&
    typeof value.effects.status.status === 'string'
  );
};

export const isTransactionSuccessful = (transactionResult: unknown): boolean => {
  if (isTransactionResult(transactionResult)) {
    const isSuccess = transactionResult.effects.status.status === 'success';

    if (!isSuccess) {
      console.warn(`Transaction ${transactionResult.digest} was not successful.`);
    }

    return isSuccess;
  } else {
    console.warn('Transaction is not in a valid shape.');
    console.warn('Transaction wrong shape: ', transactionResult);

    return false;
  }
};
