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