import BigNumber from "bignumber.js";
import { SuiTransactionBlockResponse } from "./types";

/**
 * Validates the coin name to be a non-empty string.
 *
 * @param {string} coinName - The coin name to validate.
 * @returns {boolean} - Returns true if the coin name is valid, otherwise false.
 */
export function validateCoinName(coinName: string): boolean {
  return typeof coinName === "string" && coinName.trim() !== "";
}

/**
 * Validates the coin symbol based on the specified pattern.
 *
 * @param {string} coinSymbol - The coin symbol to validate.
 * @return {boolean} - Returns true if the coin symbol is valid, otherwise false.
 */
export function validateCoinSymbol(coinSymbol: string): boolean {
  const regex = /^[a-zA-Z_]+$/;
  const isCoinSymbolIsValid = typeof coinSymbol === "string" && regex.test(coinSymbol);

  return isCoinSymbolIsValid;
}
/**
 * Validates the coin description to be a string.
 *
 * @param {string} coinDescription - The coin description to validate.
 * @returns {boolean} - Returns true if the coin description is a string, otherwise false.
 */
export function validateCoinDescription(coinDescription: string): boolean {
  return typeof coinDescription === "string";
}

/**
 * Validates the total supply to be a string containing only numbers and not exceeding the specified maxTotalSupply.
 *
 * @param {string} totalSupply - The total supply to validate.
 * @param {BigNumber} maxTotalSupply - The maximum allowed total supply as a BigNumber.
 * @return {boolean} - Returns true if the total supply is a string containing only numbers and
 * does not exceed or equal maxTotalSupply, otherwise false.
 */
export function validateTotalSupply(totalSupply: string, maxTotalSupply: BigNumber): boolean {
  if (typeof totalSupply !== "string" || !/^\d+$/.test(totalSupply)) {
    return false; // Return false if totalSupply is not a string containing only numbers
  }

  const totalSupplyBigNumber = new BigNumber(totalSupply);
  const isTotalSupplyIsValid = totalSupplyBigNumber.isLessThanOrEqualTo(maxTotalSupply);

  console.debug("isTotalSupplyIsValid: ", isTotalSupplyIsValid);

  return isTotalSupplyIsValid;
}

/**
 * Validates the coin decimals based on the specified pattern.
 *
 * @param {string} coinDecimals - The coin decimals to validate (as a string).
 * @returns {boolean} - Returns true if the coin decimals are a valid integer, otherwise false.
 */
export function validateCoinDecimals(coinDecimals: string): boolean {
  // Convert the string to an integer
  const decimalsAsInt = parseInt(coinDecimals, 10);

  // Check if the conversion is successful and perform the validations
  return (
    typeof decimalsAsInt === "number" &&
    !isNaN(decimalsAsInt) &&
    decimalsAsInt >= 0 &&
    decimalsAsInt <= 11 &&
    decimalsAsInt === Math.floor(decimalsAsInt)
  );
}

/**
 * Calculate the maximum total supply based on decimals.
 *
 * @param {number} decimals - The number of decimals for the token.
 * @returns {BigNumber} The maximum total supply.
 */
export function calculateMaxTotalSupply(decimals: string): BigNumber {
  const pow = 19 - parseInt(decimals);
  const output = new BigNumber(10).pow(pow).minus(1);

  return output;
}

/**
 * Retrieves the coin type from the transaction result.
 *
 * @param {SuiTransactionBlockResponse} transactionResult - The transaction result to extract the coin type from.
 * @returns {string} The coin type extracted from the transaction result.
 * @throws {Error} Throws an error if the required object changes are not found in the transaction result.
 */
export function getCoinTypeFromTransactionResult(transactionResult: SuiTransactionBlockResponse): string {
  const requiredObjectTypePart = "coin::TreasuryCap";
  const objectChanges = transactionResult.objectChanges;

  if (objectChanges === null || objectChanges === undefined) {
    throw new Error(
      "[getCoinTypeFromTransactionResult] object changes are null or " +
        `undefined for transaction ${transactionResult.digest}`,
    );
  }

  const createdObjectChanges = objectChanges.filter((change) => change.type === "created");

  if (createdObjectChanges.length === 0) {
    throw new Error(
      "[getCoinTypeFromTransactionResult] there is no created object changes " +
        `for transaction ${transactionResult.digest}`,
    );
  }

  const requiredObjectChange = createdObjectChanges.find(
    (change) => change.type === "created" && change.objectType.includes(requiredObjectTypePart),
  );

  if (requiredObjectChange === undefined) {
    throw new Error(
      `[getCoinTypeFromTransactionResult] there is no object change with "${requiredObjectTypePart}" ` +
        `for transaction ${transactionResult.digest}`,
    );
  }

  const matches = requiredObjectChange.type === "created" && requiredObjectChange.objectType.match(/<([^>]*)>/);

  if (matches && matches[1]) {
    const coinType = matches[1];

    return coinType;
  } else {
    throw new Error(
      "[getCoinTypeFromTransactionResult] could find enough matches to get coinType " +
        `from object changes.\nrequiredObjectChange: ${JSON.stringify(requiredObjectChange)}\n` +
        `matches: ${JSON.stringify(matches)}`,
    );
  }
}
