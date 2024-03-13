import {
  AftermathSingleton,
  CetusSingleton,
  CoinAssetData,
  CoinManagerSingleton,
  CommonCoinData,
  FlowxSingleton,
  LONG_SUI_COIN_TYPE,
  RedisStorageSingleton,
  RouteManager,
  SHORT_SUI_COIN_TYPE,
  SUI_DECIMALS,
  TurbosSingleton,
  WalletManagerSingleton,
  clmmMainnet,
  getLpCoinDecimals,
  getSuiProvider,
  isValidSuiAddress,
  isValidTokenAddress,
  isValidTokenAmount,
  transactionFromSerializedTransaction,
} from '@avernikoz/rinbot-sui-sdk';
import BigNumber from 'bignumber.js';
import { v4 as uuidv4 } from 'uuid';
import { getRedisClient } from '../config/redis.config';
import closeConversation from '../inline-keyboards/closeConversation';
import continueKeyboard from '../inline-keyboards/continue';
import goHome from '../inline-keyboards/goHome';
import { retryAndGoHomeButtonsData } from '../inline-keyboards/retryConversationButtonsFactory';
import skip from '../inline-keyboards/skip';
import yesOrNo from '../inline-keyboards/yesOrNo';
import menu from '../menu/main';
import { nft_menu } from '../menu/nft';
import positions_menu from '../menu/positions';
import { AxiosPriceApiResponse, BotContext, CoinAssetDataExtended, MyConversation, PriceApiPayload } from '../types';
import { ConversationId } from './conversations.config';
import {
  calculateMaxTotalSupply,
  getCoinTypeFromTransactionResult,
  validateCoinDecimals,
  validateCoinDescription,
  validateCoinName,
  validateCoinSymbol,
  validateTotalSupply,
} from './createCoin.utils';
import {
  SUI_LIQUIDITY_PROVIDERS_CACHE_OPTIONS,
  SUI_PROVIDER_URL,
} from './sui.config';
import { SuiTransactionBlockResponse } from './types';
import {
  extractCoinTypeFromLink,
  findCoinInAssets,
  getAftermathPoolLink,
  getSuiVisionCoinLink,
  getSuitableCoinImageData,
  getTelegramFileUrl,
  imageUrlToBase64,
  isCoinAssetData,
  isTransactionSuccessful,
  isValidCoinLink,
  sleep,
  swapTokenTypesAreEqual,
} from './utils';
import axios from 'axios';

import {
  BOT_PRIVATE_KEY,
  EXTERNAL_WALLET_ADDRESS_TO_STORE_FEES,
  TRADE_FEE,
  WELCOME_BONUS_AMOUNT,
  WELCOME_BONUS_MIN_TRADES_LIMIT,
} from '../config/bot.config';
import { calculate } from './pnl.utils';

export enum TransactionResultStatus {
  Success = 'success',
  Failure = 'failure',
}

export const random_uuid = process.env.DEBUG_INSTANCE_ID ? uuidv4() : '';

export const provider = getSuiProvider({ url: SUI_PROVIDER_URL });

export const getTurbos = async () => {
  const { redisClient } = await getRedisClient();
  const storage = RedisStorageSingleton.getInstance(redisClient);

  // console.time(`TurbosSingleton.getInstance.${random_uuid}`)
  const turbos = await TurbosSingleton.getInstance({
    suiProviderUrl: SUI_PROVIDER_URL,
    cacheOptions: { ...SUI_LIQUIDITY_PROVIDERS_CACHE_OPTIONS, storage },
    lazyLoading: false,
  });
  // console.timeEnd(`TurbosSingleton.getInstance.${random_uuid}`)

  return turbos;
};

export const getFlowx = async () => {
  const { redisClient } = await getRedisClient();
  const storage = RedisStorageSingleton.getInstance(redisClient);

  // console.time(`FlowxSingleton.getInstance.${random_uuid}`)
  const flowx = await FlowxSingleton.getInstance({
    cacheOptions: { ...SUI_LIQUIDITY_PROVIDERS_CACHE_OPTIONS, storage },
    lazyLoading: false,
  });
  // console.timeEnd(`FlowxSingleton.getInstance.${random_uuid}`)

  return flowx;
};

export const getCetus = async () => {
  const { redisClient } = await getRedisClient();
  const storage = RedisStorageSingleton.getInstance(redisClient);

  // console.time(`CetusSingleton.getInstance.${random_uuid}`)
  const cetus = await CetusSingleton.getInstance({
    suiProviderUrl: SUI_PROVIDER_URL,
    sdkOptions: clmmMainnet,
    cacheOptions: { ...SUI_LIQUIDITY_PROVIDERS_CACHE_OPTIONS, storage },
    lazyLoading: false,
  });
  // console.timeEnd(`CetusSingleton.getInstance.${random_uuid}`)

  return cetus;
};

export const getAftermath = async () => {
  const { redisClient } = await getRedisClient();
  const storage = RedisStorageSingleton.getInstance(redisClient);

  // console.time(`AftermathSingleton.getInstance.${random_uuid}`)
  const aftermath = await AftermathSingleton.getInstance({
    cacheOptions: { ...SUI_LIQUIDITY_PROVIDERS_CACHE_OPTIONS, storage },
    lazyLoading: false,
  });
  // console.timeEnd(`AftermathSingleton.getInstance.${random_uuid}`)

  return aftermath;
};

export const getCoinManager = async () => {
  console.time(`CoinManagerSingleton.getInstance ${random_uuid}`);
  const providers = await Promise.all([
    getAftermath(),
    getCetus(),
    getTurbos(),
    getFlowx(),
  ]);

  const coinManager = CoinManagerSingleton.getInstance(
    providers,
    SUI_PROVIDER_URL,
  );
  console.timeEnd(`CoinManagerSingleton.getInstance ${random_uuid}`);

  return coinManager;
};

export const getWalletManager = async () => {
  // console.time(`WalletManagerSingleton.getInstance.${random_uuid}`)
  const coinManager = await getCoinManager();

  const walletManager = WalletManagerSingleton.getInstance(
    provider,
    coinManager,
  );
  // console.timeEnd(`WalletManagerSingleton.getInstance.${random_uuid}`)

  return walletManager;
};

export const getRouteManager = async () => {
  // console.time(`RouteManager.getInstance.${random_uuid}`)
  const coinManager = await getCoinManager();
  const providers = await Promise.all([
    getAftermath(),
    getCetus(),
    getTurbos(),
    getFlowx(),
  ]);

  const routerManager = RouteManager.getInstance(providers, coinManager);
  // console.timeEnd(`RouteManager.getInstance.${random_uuid}`)
  return routerManager;
};

async function chargeTradeFee(ctx: BotContext, amount: string){ //amount in sui

  const walletManager = await getWalletManager();
  let { totalGasFee } =
    await walletManager.getAvailableWithdrawSuiAmount(ctx.session.publicKey);
  let tx;

  try {
    const fee = (TRADE_FEE/100 * +amount).toString()

    const txBlock = await WalletManagerSingleton.getWithdrawSuiTransaction({
      amount: fee,
      address: EXTERNAL_WALLET_ADDRESS_TO_STORE_FEES,
    });
    txBlock.setGasBudget(Number(totalGasFee));
    tx = txBlock;
  } catch (error) {
    console.error(error);

    if (error instanceof Error) {
      console.error(
        `[routerManager.getBestRouteTransaction] failed to create transaction: ${error.message}`,
      );
    } else {
      console.error(
        `[routerManager.getBestRouteTransaction] failed to create transaction: ${error}`,
      );
    }

    return;
  }
  try {
    const res = await provider.signAndExecuteTransactionBlock({
      transactionBlock: tx,
      signer: WalletManagerSingleton.getKeyPairFromPrivateKey(
        ctx.session.privateKey,
      ),
      options: {
        showEffects: true,
      },
    });

    if (res.effects?.status.status === 'failure') {
        console.error(`Withdraw failed :(\n\nhttps://suiscan.xyz/mainnet/tx/${res.digest}`)
      return;
    }
    console.log(`Withdraw successful!\n\nhttps://suiscan.xyz/mainnet/tx/${res.digest}`)
  } catch (error) {
    if (error instanceof Error) {
      console.error(
        `[provider.signAndExecuteTransactionBlock] failed to send transaction: ${error.message}`,
      );
    } else {
      console.error(
        `[provider.signAndExecuteTransactionBlock] failed to send transaction: ${error}`,
      );
    }
    return;
  }
}

export async function buy(conversation: MyConversation, ctx: BotContext) {
  await ctx.reply(
    'Which token do you want to buy? Please send a coin type or a link to suiscan.',
    { reply_markup: closeConversation },
  );

  await ctx.reply(
    'Example of coin type format:\n<code>0xb6baa75577e4bbffba70207651824606e51d38ae23aa94fb9fb700e0ecf50064::kimchi::KIMCHI</code>\n\nExample of suiscan link:\nhttps://suiscan.xyz/mainnet/coin/0xb6baa75577e4bbffba70207651824606e51d38ae23aa94fb9fb700e0ecf50064::kimchi::KIMCHI',
    { parse_mode: 'HTML' },
  );

  const coinManager = await getCoinManager();
  const retryButton = retryAndGoHomeButtonsData[ConversationId.Buy];

  let validatedCoinType: string | undefined;
  await conversation.waitUntil(async (ctx) => {
    if (ctx.callbackQuery?.data === 'close-conversation') {
      return false;
    }

    const possibleCoin = (ctx.msg?.text || '').trim();
    const coinTypeIsValid = isValidTokenAddress(possibleCoin);
    const suiScanLinkIsValid = isValidCoinLink(possibleCoin);

    if (!coinTypeIsValid && !suiScanLinkIsValid) {
      const replyText =
        'Token address or suiscan link is not correct. Make sure inputed data is correct.\n\nYou can enter a token address or a Suiscan link.';

      await ctx.reply(replyText, { reply_markup: closeConversation });

      return false;
    }

    const coinType: string | null = coinTypeIsValid
      ? possibleCoin
      : extractCoinTypeFromLink(possibleCoin);

    // ts check
    if (coinType === null) {
      await ctx.reply(
        'Suiscan link is not valid. Make sure it is correct.\n\nYou can enter a token address or a Suiscan link.',
        { reply_markup: closeConversation },
      );
      return false;
    }

    const fetchedCoin = await coinManager.getCoinByType2(coinType);

    if (fetchedCoin === null) {
      await ctx.reply(
        `Coin type not found. Make sure type "${coinType}" is correct.\n\nYou can enter a coin type or a Suiscan link.`,
        { reply_markup: closeConversation },
      );

      return false;
    }

    const tokenToBuyIsSui: boolean =
      swapTokenTypesAreEqual(fetchedCoin.type, LONG_SUI_COIN_TYPE) ||
      swapTokenTypesAreEqual(fetchedCoin.type, SHORT_SUI_COIN_TYPE);

    if (tokenToBuyIsSui) {
      await ctx.reply(
        `You cannot buy SUI for SUI. Please, specify another token to buy.`,
        { reply_markup: closeConversation },
      );

      return false;
    }

    validatedCoinType = fetchedCoin.type;
    return true;
  });

  const availableBalance = await conversation.external(async () => {
    const walletManager = await getWalletManager();
    // TODO: Maybe we should add try/catch here as well
    const balance = await walletManager.getAvailableSuiBalance(
      ctx.session.publicKey,
    );

    return balance;
  });

  await ctx.reply(
    `Reply with the amount you wish to spend (<code>0</code> - <code>${availableBalance}</code> SUI).\n\nExample: <code>0.1</code>`,
    { reply_markup: closeConversation, parse_mode: 'HTML' },
  );

  let validatedInputAmount: string | undefined;
  await conversation.waitUntil(async (ctx) => {
    if (ctx.callbackQuery?.data === 'close-conversation') {
      return false;
    }

    const inputAmount = ctx.msg?.text;

    // ts check
    if (inputAmount === undefined) {
      return false;
    }

    // TODO: TEST
    const { isValid: amountIsValid, reason } = isValidTokenAmount({
      amount: inputAmount,
      maxAvailableAmount: availableBalance,
      decimals: SUI_DECIMALS,
    });

    if (!amountIsValid) {
      await ctx.reply(
        `Invalid amount. Reason: ${reason}\n\nPlease, try again.`,
        { reply_markup: closeConversation },
      );

      return false;
    }

    await ctx.reply('Initiating swap...' + random_uuid);

    validatedInputAmount = inputAmount;
    return true;
  });

  // ts check
  if (!validatedCoinType || !validatedInputAmount) {
    await ctx.reply(
      `Invalid coinType or inputAmount. Please try again or contact support.`,
      { reply_markup: retryButton },
    );

    return;
  }

  await chargeTradeFee(ctx, validatedInputAmount)

  // TODO: Re-check args here
  const tx = await conversation.external({
    args: [validatedCoinType, validatedInputAmount],
    task: async (validatedCoinType: string, validatedInputAmount: string) => {
      try {
        const routerManager = await getRouteManager();
        const transaction = await routerManager.getBestRouteTransaction({
          tokenFrom: LONG_SUI_COIN_TYPE,
          tokenTo: validatedCoinType,
          amount: validatedInputAmount,
          signerAddress: ctx.session.publicKey,
          slippagePercentage: ctx.session.settings.slippagePercentage,
        });

        return transaction;
      } catch (error) {
        console.error(error);

        if (error instanceof Error) {
          console.error(
            `[routerManager.getBestRouteTransaction] failed to create transaction: ${error.message}`,
          );
        } else {
          console.error(
            `[routerManager.getBestRouteTransaction] failed to create transaction: ${error}`,
          );
        }

        return;
      }
    },
    beforeStore: (value) => {
      if (value) {
        return value.serialize();
      }
    },
    afterLoad: async (value) => {
      if (value) {
        return transactionFromSerializedTransaction(value);
      }
    },
    afterLoadError: async (error) => {
      console.debug(
        `Error in afterLoadError for ${ctx.from?.username} and instance ${random_uuid}`,
      );
      console.error(error);
    },
    beforeStoreError: async (error) => {
      console.debug(
        `Error in beforeStoreError for ${ctx.from?.username} and instance ${random_uuid}`,
      );
      console.error(error);
    },
  });

  if (!tx) {
    await ctx.reply('Transaction creation failed.', {
      reply_markup: retryButton,
    });

    return;
  }

  await ctx.reply('Route for swap found, sending transaction...' + random_uuid);

  const resultOfSwap = await conversation.external(async () => {
    try {
      const res = await provider.signAndExecuteTransactionBlock({
        transactionBlock: tx,
        signer: WalletManagerSingleton.getKeyPairFromPrivateKey(
          ctx.session.privateKey,
        ),
        options: {
          showEffects: true,
        },
      });

      const isTransactionResultSuccessful = isTransactionSuccessful(res);
      const result = isTransactionResultSuccessful
        ? TransactionResultStatus.Success
        : TransactionResultStatus.Failure;

      return { digest: res.digest, result };
    } catch (error) {
      if (error instanceof Error) {
        console.error(
          `[provider.signAndExecuteTransactionBlock] failed to send transaction: ${error.message}`,
        );
      } else {
        console.error(
          `[provider.signAndExecuteTransactionBlock] failed to send transaction: ${error}`,
        );
      }

      const result = TransactionResultStatus.Failure;
      return { result: result, reason: 'failed_to_send_transaction' };
    }
  });

  if (resultOfSwap.result === 'success' && resultOfSwap.digest) {
    await ctx.reply(
      `Swap successful!\n\nhttps://suiscan.xyz/mainnet/tx/${resultOfSwap.digest}`,
      { reply_markup: retryButton },
    );

    conversation.session.tradesCount = conversation.session.tradesCount + 1;

    return;
  }

  if (resultOfSwap.result === 'failure' && resultOfSwap.digest) {
    await ctx.reply(
      `Swap failed.\n\nhttps://suiscan.xyz/mainnet/tx/${resultOfSwap.digest}`,
      { reply_markup: retryButton },
    );

    return;
  }

  await ctx.reply('Transaction sending failed.', { reply_markup: retryButton });
}

export async function sell(
  conversation: MyConversation,
  ctx: BotContext,
): Promise<void> {
  const availableBalance = await conversation.external(async () => {
    const walletManager = await getWalletManager();
    // TODO: Maybe we should add try/catch here as well
    const balance = await walletManager.getAvailableSuiBalance(
      ctx.session.publicKey,
    );

    return balance;
  });
  const isAmountSuiAmountIsValid = +availableBalance > 0;
  const retryButton = retryAndGoHomeButtonsData[ConversationId.Sell];

  if (!isAmountSuiAmountIsValid) {
    await ctx.reply(
      "You don't have enough SUI for transaction gas. Please, top up your SUI balance to continue.",
      { reply_markup: retryButton },
    );

    return;
  }

  await ctx.reply(
    'Which token do you want to sell? Please send a coin type or a link to suiscan.',
    { reply_markup: closeConversation },
  );

  await ctx.reply(
    'Example of coin type format:\n<code>0xb6baa75577e4bbffba70207651824606e51d38ae23aa94fb9fb700e0ecf50064::kimchi::KIMCHI</code>\n\nExample of suiscan link:\nhttps://suiscan.xyz/mainnet/coin/0xb6baa75577e4bbffba70207651824606e51d38ae23aa94fb9fb700e0ecf50064::kimchi::KIMCHI',
    { parse_mode: 'HTML' },
  );

  const coinManager = await getCoinManager();
  const allCoinsAssets = await conversation.external(async () => {
    const walletManager = await getWalletManager();
    // TODO: Maybe we should add try/catch here as well
    const coinAssets = await walletManager.getAllCoinAssets(
      ctx.session.publicKey,
    );

    return coinAssets;
  });

  let validatedCoin: CoinAssetData | null = null;
  await conversation.waitUntil(async (ctx) => {
    if (ctx.callbackQuery?.data === 'close-conversation') {
      return false;
    }

    const possibleCoin = (ctx.msg?.text || '').trim();
    const coinTypeIsValid = isValidTokenAddress(possibleCoin);
    const suiScanLinkIsValid = isValidCoinLink(possibleCoin);

    if (!coinTypeIsValid && !suiScanLinkIsValid) {
      const replyText =
        'Token address or suiscan link is not correct. Make sure inputed data is correct.\n\nYou can enter a token address or a Suiscan link.';

      await ctx.reply(replyText, { reply_markup: closeConversation });

      return false;
    }

    let coinType: string;
    if (coinTypeIsValid) {
      coinType = possibleCoin;
    } else {
      const extractedCoin: string | null =
        extractCoinTypeFromLink(possibleCoin);

      // ts check
      if (extractedCoin === null) {
        await ctx.reply(
          'Suiscan link is not valid. Make sure it is correct.\n\nYou can enter a token address or a Suiscan link.',
          { reply_markup: closeConversation },
        );

        return false;
      }

      coinType = extractedCoin;
    }

    const fetchedCoin = await coinManager.getCoinByType2(coinType);

    if (fetchedCoin === null) {
      await ctx.reply(
        `Coin type not found. Make sure type "${coinType}" is correct.\n\nYou can enter a coin type or a Suiscan link.`,
        { reply_markup: closeConversation },
      );

      return false;
    }

    const tokenToSellIsSui: boolean =
      swapTokenTypesAreEqual(fetchedCoin.type, LONG_SUI_COIN_TYPE) ||
      swapTokenTypesAreEqual(fetchedCoin.type, SHORT_SUI_COIN_TYPE);

    if (tokenToSellIsSui) {
      await ctx.reply(
        `You cannot sell SUI for SUI. Please, specify another token to sell.`,
        { reply_markup: closeConversation },
      );

      return false;
    }

    const foundCoin = findCoinInAssets(allCoinsAssets, coinType);

    if (foundCoin === undefined) {
      await ctx.reply(
        'Token is not found in your wallet assets. Please, specify another token to sell.',
        { reply_markup: closeConversation },
      );

      return false;
    }

    validatedCoin = foundCoin;
    return true;
  });

  // Note: The following check and type assertion exist due to limitations or issues in TypeScript type checking for this specific case.
  // The if statement is not expected to execute, and the type assertion is used to satisfy TypeScript's type system.
  if (!isCoinAssetData(validatedCoin)) {
    await ctx.reply(
      'Token is not found in your wallet assets. Please, specify another token to sell.',
      { reply_markup: retryButton },
    );

    return;
  }

  const validCoinToSell = validatedCoin as CoinAssetData;

  await ctx.reply(
    `Reply with the amount you wish to sell (<code>0</code> - <code>${validCoinToSell.balance}</code> ${validCoinToSell.symbol || validCoinToSell.type}).\n\nExample: <code>0.1</code>`,
    { reply_markup: closeConversation, parse_mode: 'HTML' },
  );

  let validatedInputAmount: string;
  await conversation.waitUntil(async (ctx) => {
    if (ctx.callbackQuery?.data === 'close-conversation') {
      return false;
    }

    const inputAmount = ctx.msg?.text;

    // ts check
    if (inputAmount === undefined) {
      return false;
    }

    const decimals = validCoinToSell.decimals;
    // ts check
    if (decimals === null) {
      await ctx.reply(
        `Token decimals not found for ${validCoinToSell.type}. Please, use another token for sell or contact support.`,
        { reply_markup: closeConversation },
      );

      return false;
    }

    // TODO: Re-check this
    const { isValid: amountIsValid, reason } = isValidTokenAmount({
      amount: inputAmount,
      maxAvailableAmount: validCoinToSell.balance,
      decimals,
    });

    if (!amountIsValid) {
      await ctx.reply(
        `Invalid amount. Reason: ${reason}\n\nPlease, try again.`,
        { reply_markup: closeConversation },
      );

      return false;
    }

    validatedInputAmount = inputAmount;
    return true;
  });

  //await chargeTradeFee(ctx, )

  await ctx.reply('Initiating swap...');

  const tx = await conversation.external({
    task: async () => {
      try {
        const routerManager = await getRouteManager();
        const transaction = await routerManager.getBestRouteTransaction({
          tokenFrom: validCoinToSell.type,
          tokenTo: LONG_SUI_COIN_TYPE,
          amount: validatedInputAmount,
          signerAddress: ctx.session.publicKey,
          slippagePercentage: ctx.session.settings.slippagePercentage || 10,
        });

        return transaction;
      } catch (error) {
        console.error(error);

        if (error instanceof Error) {
          console.error(
            `[routerManager.getBestRouteTransaction] failed to create transaction: ${error.message}`,
          );
        } else {
          console.error(
            `[routerManager.getBestRouteTransaction] failed to create transaction: ${error}`,
          );
        }

        return;
      }
    },
    beforeStore: (value) => {
      if (value) {
        return value.serialize();
      }
    },
    afterLoad: async (value) => {
      if (value) {
        return transactionFromSerializedTransaction(value);
      }
    },
    afterLoadError: async (error) => {
      console.debug(
        `Error in afterLoadError for ${ctx.from?.username} and instance ${random_uuid}`,
      );
      console.error(error);
    },
    beforeStoreError: async (error) => {
      console.debug(
        `Error in beforeStoreError for ${ctx.from?.username} and instance ${random_uuid}`,
      );
      console.error(error);
    },
  });

  if (!tx) {
    await ctx.reply('Transaction creation failed', {
      reply_markup: retryButton,
    });

    return;
  }

  await ctx.reply('Route for swap found, sending transaction...' + random_uuid);

  const resultOfSwap: {
    digest?: string;
    result: TransactionResultStatus;
    reason?: string;
  } = await conversation.external(async () => {
    try {
      const res = await provider.signAndExecuteTransactionBlock({
        transactionBlock: tx,
        signer: WalletManagerSingleton.getKeyPairFromPrivateKey(
          ctx.session.privateKey,
        ),
        options: {
          showEffects: true,
        },
      });
      
      const isTransactionResultSuccessful = isTransactionSuccessful(res);
      const result = isTransactionResultSuccessful
        ? TransactionResultStatus.Success
        : TransactionResultStatus.Failure;

      const balanceChanges = await res.balanceChanges
      console.log(balanceChanges);
      

      return { digest: res.digest, result };
    } catch (error) {
      if (error instanceof Error) {
        console.error(
          `[provider.signAndExecuteTransactionBlock] failed to send transaction: ${error.message}`,
        );
      } else {
        console.error(
          `[provider.signAndExecuteTransactionBlock] failed to send transaction: ${error}`,
        );
      }

      const result = TransactionResultStatus.Failure;
      return { result: result, reason: 'failed_to_send_transaction' };
    }
  });

  if (resultOfSwap.result === 'success' && resultOfSwap.digest) {
    await ctx.reply(
      `Swap successful!\n\nhttps://suiscan.xyz/mainnet/tx/${resultOfSwap.digest}`,
      { reply_markup: retryButton },
    );

    conversation.session.tradesCount = conversation.session.tradesCount + 1;

    return;
  }

  if (resultOfSwap.result === 'failure' && resultOfSwap.digest) {
    await ctx.reply(
      `Swap failed.\n\nhttps://suiscan.xyz/mainnet/tx/${resultOfSwap.digest}`,
      { reply_markup: retryButton },
    );

    return;
  }

  await ctx.reply('Transaction sending failed.', { reply_markup: retryButton });
}

export async function exportPrivateKey(
  conversation: MyConversation,
  ctx: BotContext,
): Promise<void> {
  const {
    welcomeBonus: { isUserAgreeWithBonus, isUserClaimedBonus },
    tradesCount,
  } = ctx.session;
  const isUserNotEligibleToExportPrivateKey =
    isUserAgreeWithBonus &&
    isUserClaimedBonus &&
    tradesCount < WELCOME_BONUS_MIN_TRADES_LIMIT;

  if (isUserNotEligibleToExportPrivateKey) {
    await ctx.reply(
      `🔐 Oops! It seems you're eager to export your private key. \nTo maintain the security of your assets and adhere to our bonus policy, you can only export your private key after completing ${WELCOME_BONUS_MIN_TRADES_LIMIT} trades. \n\nKeep trading to unlock this feature and secure your gains! \nHappy trading! 📈`,
      { reply_markup: goHome },
    );

    return;
  }

  await ctx.reply(
    `Are you sure want to export private key? Please type <code>CONFIRM</code> if yes.`,
    { reply_markup: closeConversation, parse_mode: 'HTML' },
  );

  const retryButton =
    retryAndGoHomeButtonsData[ConversationId.ExportPrivateKey];
  const messageData = await conversation.waitFor(':text');
  const isExportConfirmed = messageData.msg.text === 'CONFIRM';

  if (!isExportConfirmed) {
    await ctx.reply(
      `You've not typed CONFIRM. Ignoring your request of exporting private key.`,
      { reply_markup: retryButton },
    );

    return;
  }

  await ctx.reply(
    `Your private key is: <span class="tg-spoiler">${ctx.session.privateKey}</span>\n\nYou can now i.e. import the key into a wallet like Suiet.\nDelete this message once you are done.`,
    { parse_mode: 'HTML', reply_markup: goHome },
  );
}

export async function withdraw(
  conversation: MyConversation,
  ctx: BotContext,
): Promise<void> {
  const {
    welcomeBonus: { isUserAgreeWithBonus, isUserClaimedBonus },
    tradesCount,
  } = ctx.session;
  const isUserUsedWelcomeBonus = isUserAgreeWithBonus && isUserClaimedBonus;

  if (isUserUsedWelcomeBonus) {
    await ctx.reply(
      `💸 Hold on! Before you go withdrawing, a quick heads up. \n\nWhile you can deposit and trade more SUI, the initial ${conversation.session.welcomeBonus.amount} SUI bonus is non-withdrawable. \n\nBut hey, the profits you make from trading? Those are yours to take! \nKeep growing that portfolio and enjoy the fruits of your trading strategies. \nHappy profiting! 🌈🚀`,
    );
  }

  await ctx.reply(
    `Please, type the address to which you would like to send your SUI.`,
    { reply_markup: closeConversation },
  );
  const retryButton = retryAndGoHomeButtonsData[ConversationId.Withdraw];

  const messageData = await conversation.waitUntil(async (ctx) => {
    if (ctx.callbackQuery?.data === 'close-conversation') {
      return false;
    }

    const destinationSuiAddress = ctx.msg?.text;

    if (destinationSuiAddress === undefined) {
      return false;
    }

    const addressIsValid = isValidSuiAddress(destinationSuiAddress);

    if (!addressIsValid) {
      await ctx.reply(
        `Destination wallet address is not correct.\n\nPlease, try again.`,
        { reply_markup: closeConversation },
      );

      return false;
    }

    return true;
  });
  const destinationSuiAddress = messageData.msg?.text;

  // ts check
  if (destinationSuiAddress === undefined) {
    await ctx.reply(
      `Destination wallet address is not correct.\n\nCannot continue.`,
      { reply_markup: closeConversation },
    );
    return;
  }

  const walletManager = await getWalletManager();
  let { availableAmount, totalGasFee } =
    await walletManager.getAvailableWithdrawSuiAmount(ctx.session.publicKey);

  // Decrease available amount in case user participate in the welcome bonus program
  availableAmount = isUserUsedWelcomeBonus
    ? (parseFloat(availableAmount) - WELCOME_BONUS_AMOUNT).toString()
    : availableAmount;

  // There is no sense to allow user reply with amount in case it's 0 or less than 0
  if (parseFloat(availableAmount) <= 0) {
    await ctx.reply(
      `⚠️ Heads up! Your available balance is currently ${conversation.session.welcomeBonus.amount} SUI or less. \n\nAt the moment, there are no funds available for withdrawal. Keep in mind that the initial ${conversation.session.welcomeBonus.amount} SUI bonus is non-withdrawable. \n\nTrade strategically to build up your balance, and soon you'll be able to withdraw those well-earned profits. \nStay focused on your trading goals! 📊💼`,
      { reply_markup: goHome },
    );

    return;
  }

  await ctx.reply(
    `Reply with the amount you wish to withdraw (<code>0</code> - <code>${availableAmount}</code> SUI).\n\nExample: <code>0.1</code>`,
    { reply_markup: closeConversation, parse_mode: 'HTML' },
  );

  const amountData = await conversation.waitUntil(async (ctx) => {
    if (ctx.callbackQuery?.data === 'close-conversation') {
      return false;
    }

    const inputAmount = ctx.msg?.text;

    if (inputAmount === undefined) {
      return false;
    }

    const { isValid: amountIsValid, reason } = isValidTokenAmount({
      amount: inputAmount,
      maxAvailableAmount: availableAmount,
      decimals: SUI_DECIMALS,
    });

    if (!amountIsValid) {
      await ctx.reply(
        `Invalid amount. Reason: ${reason}\n\nPlease, try again.`,
        { reply_markup: closeConversation },
      );

      return false;
    }

    return true;
  });
  const inputAmount = amountData.msg?.text;

  // ts check
  if (inputAmount === undefined) {
    await ctx.reply(`Invalid amount.\n\nCannot continue.`, {
      reply_markup: retryButton,
    });
    return;
  }

  await ctx.reply('Initiating withdrawal...');
  let tx;

  try {
    const txBlock = await WalletManagerSingleton.getWithdrawSuiTransaction({
      amount: inputAmount,
      address: destinationSuiAddress,
    });
    txBlock.setGasBudget(Number(totalGasFee));
    tx = txBlock;
  } catch (error) {
    console.error(error);

    if (error instanceof Error) {
      console.error(
        `[routerManager.getBestRouteTransaction] failed to create transaction: ${error.message}`,
      );
    } else {
      console.error(
        `[routerManager.getBestRouteTransaction] failed to create transaction: ${error}`,
      );
    }

    await ctx.reply('Transaction creation failed :(', {
      reply_markup: retryButton,
    });

    return;
  }

  await ctx.reply('Sending withdraw transaction...');

  try {
    const res = await provider.signAndExecuteTransactionBlock({
      transactionBlock: tx,
      signer: WalletManagerSingleton.getKeyPairFromPrivateKey(
        ctx.session.privateKey,
      ),
      options: {
        showEffects: true,
      },
    });

    if (res.effects?.status.status === 'failure') {
      await ctx.reply(
        `Withdraw failed :(\n\nhttps://suiscan.xyz/mainnet/tx/${res.digest}`,
        { reply_markup: retryButton },
      );

      return;
    }

    await ctx.reply(
      `Withdraw successful!\n\nhttps://suiscan.xyz/mainnet/tx/${res.digest}`,
      { reply_markup: retryButton },
    );
  } catch (error) {
    if (error instanceof Error) {
      console.error(
        `[provider.signAndExecuteTransactionBlock] failed to send transaction: ${error.message}`,
      );
    } else {
      console.error(
        `[provider.signAndExecuteTransactionBlock] failed to send transaction: ${error}`,
      );
    }

    await ctx.reply('Transaction sending failed :(', {
      reply_markup: retryButton,
    });

    return;
  }
}

export async function availableBalance(ctx: BotContext): Promise<string> {
  const walletManager = await getWalletManager();
  const availableBalance = await walletManager.getAvailableSuiBalance(
    ctx.session.publicKey,
  );
  return availableBalance as string;
}

export async function balance(ctx: BotContext): Promise<string> {
  const walletManager = await getWalletManager();
  const balance = await walletManager.getSuiBalance(ctx.session.publicKey);
  return balance;
}

export async function assets(ctx: BotContext): Promise<void> {
  try {
    const walletManager = await getWalletManager();
    let allCoinsAssets = await walletManager.getAllCoinAssets(
      ctx.session.publicKey,
    );

    ctx.session.assets = allCoinsAssets;
    let data: PriceApiPayload = {data: []}
    allCoinsAssets.forEach(coin => {
      //move to price api
      if(coin.type === '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI')
        coin.type = "0x2::sui::SUI"
      data.data.push({chainId: "sui", tokenAddress: coin.type})
    })
    try {
      const response = await axios.post<AxiosPriceApiResponse>("https://price-api-eight.vercel.app/assets", data)
      allCoinsAssets = allCoinsAssets.map((coin, index) => ({
        ...coin,
        price: response.data.data[index].price
      }));
    } catch (error) {
      console.error(error)
    }

    if (allCoinsAssets?.length === 0) {
      ctx.reply(`Your have no tokens yet.`, { reply_markup: goHome });
      return;
    }
    const assetsString = allCoinsAssets?.reduce((acc, el) => {
      const isCoinAssetDataExtended = (asset: any): asset is CoinAssetDataExtended => 'price' in asset; 
      acc = acc.concat(
        `Token: <b>${el.symbol || el.type}</b>\nType: <code>${el.type}</code>\nAmount: <code>${el.balance}</code>\n\nBalance: ${isCoinAssetDataExtended(el) ? calculate(el.balance, el.price) : null}\n\n`,
      );

      return acc;
    }, '');
    await ctx.reply(`<b>Your tokens:</b> \n\n${assetsString}`, {
      reply_markup: positions_menu,
      parse_mode: 'HTML',
    });
  } catch (e) {
    ctx.reply('Failed to fetch assets. Please, try again.', {
      reply_markup: goHome,
    });
  }
}

export function generateWallet(): any {
  return WalletManagerSingleton.generateWallet();
}

export function getExplorerLink(ctx: BotContext): string {
  return `https://suiscan.xyz/mainnet/account/${ctx.session.publicKey}`;
}

export async function home(ctx: BotContext) {
  const userBalance = await balance(ctx);
  const avl_balance = await availableBalance(ctx);
  const welcome_text = `<b>Welcome to RINbot on Sui Network</b>\n\nYour wallet address: <code>${ctx.session.publicKey}</code> \nYour SUI balance: <code>${userBalance}</code>\nYour available SUI balance: <code>${avl_balance}</code>`;
  await ctx.replyWithPhoto(
    'https://pbs.twimg.com/media/GF5lAl9WkAAOEus?format=jpg',
    { caption: welcome_text, reply_markup: menu, parse_mode: 'HTML' },
  );
}
export async function nftHome(ctx: BotContext) {
  await ctx.reply(
    '<b>Welcome to NFT menu!</b>\n\nPlease check the options below.',
    { parse_mode: 'HTML', reply_markup: nft_menu },
  );
}

// TODO: refactor code to move boilerplate code
export async function createAftermathPool(
  conversation: MyConversation,
  ctx: BotContext,
): Promise<void> {
  const closeButton = closeConversation.inline_keyboard[0];
  const continueWithCloseKeyboard = continueKeyboard
    .clone()
    .add(...closeButton);

  await ctx.reply(
    '<b>Note</b>: Currently, the Aftermath routing algorithm <b><i>indexes</i></b> pools with at least 1,000 SUI ' +
      'deposited into the pool (e.g., you create a pool with your COIN/SUI). This means that if you plan to ' +
      'create a pool using Aftermath, you should consider depositing at least 1,000 SUI to be able to use your ' +
      'pool for trading, such as conducting swaps.\n\nThis limitation is imposed by Aftermath and cannot be ' +
      'bypassed. Therefore, you may want to explore alternatives, such as creating your own pool using Cetus, ' +
      'or depositing 1,000 SUI to <b><i>enable</i></b> trading on your own pool.',
    { reply_markup: continueWithCloseKeyboard, parse_mode: 'HTML' },
  );

  const continueContext = await conversation.waitFor('callback_query:data');
  const continueCallbackQueryData = continueContext.callbackQuery.data;

  if (continueCallbackQueryData === 'close-conversation') {
    await conversation.skip();
  }
  if (continueCallbackQueryData === 'continue') {
    await continueContext.answerCallbackQuery();
  } else {
    await ctx.reply('Please, choose the button.', {
      reply_markup: closeConversation,
    });

    await conversation.skip({ drop: true });
  }

  await ctx.reply(
    'What would be <b>the first coin</b> in pool? Please send a coin type or a link to suiscan.',
    { reply_markup: closeConversation, parse_mode: 'HTML' },
  );

  await ctx.reply(
    'Example of coin type format:\n<code>0xb6baa75577e4bbffba70207651824606e51d38ae23aa94fb9fb700e0ecf50064::kimchi::KIMCHI</code>\n\nExample of suiscan link:\nhttps://suiscan.xyz/mainnet/coin/0xb6baa75577e4bbffba70207651824606e51d38ae23aa94fb9fb700e0ecf50064::kimchi::KIMCHI',
    { parse_mode: 'HTML' },
  );

  const retryButton =
    retryAndGoHomeButtonsData[ConversationId.CreateAftermathPool];
  const coinManager = await getCoinManager();
  const allCoinsAssets = await conversation.external(async () => {
    const walletManager = await getWalletManager();
    // TODO: Maybe we should add try/catch here as well
    const coinAssets = await walletManager.getAllCoinAssets(
      ctx.session.publicKey,
    );

    return coinAssets;
  });

  let firstValidatedCoin: CoinAssetData | null = null;
  await conversation.waitUntil(async (ctx) => {
    if (ctx.callbackQuery?.data === 'close-conversation') {
      return false;
    }

    const possibleCoin = (ctx.msg?.text || '').trim();
    const coinTypeIsValid = isValidTokenAddress(possibleCoin);
    const suiScanLinkIsValid = isValidCoinLink(possibleCoin);

    if (!coinTypeIsValid && !suiScanLinkIsValid) {
      const replyText =
        'Coin address or suiscan link is not correct. Make sure inputed data is correct.\n\nYou can enter a coin type or a Suiscan link.';

      await ctx.reply(replyText, { reply_markup: closeConversation });

      return false;
    }

    const coinType: string | null = coinTypeIsValid
      ? possibleCoin
      : extractCoinTypeFromLink(possibleCoin);

    // ts check
    if (coinType === null) {
      await ctx.reply(
        'Suiscan link is not valid. Make sure it is correct.\n\nYou can enter a coin type or a Suiscan link.',
        { reply_markup: closeConversation },
      );
      return false;
    }

    const fetchedCoin = await coinManager.getCoinByType2(coinType);

    if (fetchedCoin === null) {
      await ctx.reply(
        `Coin type not found. Make sure type "${coinType}" is correct.\n\nYou can enter a coin type or a Suiscan link.`,
        { reply_markup: closeConversation },
      );

      return false;
    }

    const foundCoin = findCoinInAssets(allCoinsAssets, coinType);

    if (foundCoin === undefined) {
      await ctx.reply(
        'Coin is not found in your wallet assets. Please, specify another coin to add in pool.',
        { reply_markup: closeConversation },
      );

      return false;
    }

    firstValidatedCoin = foundCoin;
    return true;
  });

  // Note: The following check and type assertion exist due to limitations or issues in TypeScript type checking for this specific case.
  // The if statement is not expected to execute, and the type assertion is used to satisfy TypeScript's type system.
  if (!isCoinAssetData(firstValidatedCoin)) {
    await ctx.reply(
      'Coin is not found in your wallet assets. Please, specify another coin to add in pool.',
      { reply_markup: retryButton },
    );

    return;
  }

  const firstValidatedCoinToAdd = firstValidatedCoin as CoinAssetData;
  console.debug('firstValidatedCoinToAdd:', firstValidatedCoinToAdd);
  const firstCoinIsSui: boolean =
    swapTokenTypesAreEqual(firstValidatedCoinToAdd.type, LONG_SUI_COIN_TYPE) ||
    swapTokenTypesAreEqual(firstValidatedCoinToAdd.type, SHORT_SUI_COIN_TYPE);
  const firstCoinHasPrice = await conversation.external(async () =>
    AftermathSingleton.coinHasPrice(firstValidatedCoinToAdd.type),
  );
  console.debug('firstCoinHasPrice:', firstCoinHasPrice);

  let availableFirstCoinMaxAmount: string;
  if (firstCoinIsSui) {
    const availableBalance = await conversation.external(async () => {
      const walletManager = await getWalletManager();
      // TODO: Maybe we should add try/catch here as well
      const balance = await walletManager.getAvailableSuiBalance(
        ctx.session.publicKey,
      );

      return balance;
    });

    availableFirstCoinMaxAmount = availableBalance;
  } else {
    availableFirstCoinMaxAmount = firstValidatedCoinToAdd.balance;
  }
  console.debug('availableFirstCoinMaxAmount:', availableFirstCoinMaxAmount);

  await ctx.reply(
    `Reply with the amount you wish to add in pool (<code>0</code> - <code>${availableFirstCoinMaxAmount}</code> ${firstValidatedCoinToAdd.symbol || firstValidatedCoinToAdd.type}).\n\nExample: <code>0.1</code>`,
    { reply_markup: closeConversation, parse_mode: 'HTML' },
  );

  const firstValidatedInputAmountMessage = await conversation.waitUntil(
    async (ctx) => {
      if (ctx.callbackQuery?.data === 'close-conversation') {
        return false;
      }

      const inputAmount = ctx.msg?.text;

      // ts check
      if (inputAmount === undefined) {
        return false;
      }

      const decimals = firstValidatedCoinToAdd.decimals;
      // ts check
      if (decimals === null) {
        await ctx.reply(
          `Coin decimals not found for ${firstValidatedCoinToAdd.type}. Please, use another coin to add in pool or contact support.`,
          { reply_markup: closeConversation },
        );

        return false;
      }

      // TODO: Re-check this
      const { isValid: amountIsValid, reason } = isValidTokenAmount({
        amount: inputAmount,
        maxAvailableAmount: availableFirstCoinMaxAmount,
        decimals,
      });

      if (!amountIsValid) {
        await ctx.reply(
          `Invalid amount. Reason: ${reason}\n\nPlease, try again.`,
          { reply_markup: closeConversation },
        );

        return false;
      }

      return true;
    },
  );
  const firstValidatedInputAmount: string | undefined =
    firstValidatedInputAmountMessage.msg?.text;

  // ts check
  if (firstValidatedInputAmount === undefined) {
    await ctx.reply(`Invalid amount.\n\nCannot continue.`, {
      reply_markup: retryButton,
    });
    return;
  }
  console.debug('firstValidatedInputAmount:', firstValidatedInputAmount);

  await ctx.reply(
    'What would be <b>the second coin</b> in pool? Please send a coin type or a link to suiscan.',
    { reply_markup: closeConversation, parse_mode: 'HTML' },
  );

  await ctx.reply(
    'Example of coin type format:\n<code>0xb6baa75577e4bbffba70207651824606e51d38ae23aa94fb9fb700e0ecf50064::kimchi::KIMCHI</code>\n\nExample of suiscan link:\nhttps://suiscan.xyz/mainnet/coin/0xb6baa75577e4bbffba70207651824606e51d38ae23aa94fb9fb700e0ecf50064::kimchi::KIMCHI',
    { parse_mode: 'HTML' },
  );

  let secondValidatedCoin: CoinAssetData | null = null;
  let secondCoinHasPrice = false;
  let secondCoinMinAmount: string | undefined;
  let secondCoinMaxAmount: string | undefined;

  await conversation.waitUntil(async (ctx) => {
    if (ctx.callbackQuery?.data === 'close-conversation') {
      return false;
    }

    const possibleCoin = (ctx.msg?.text || '').trim();
    const coinTypeIsValid = isValidTokenAddress(possibleCoin);
    const suiScanLinkIsValid = isValidCoinLink(possibleCoin);

    if (!coinTypeIsValid && !suiScanLinkIsValid) {
      const replyText =
        'Coin address or suiscan link is not correct. Make sure inputed data is correct.\n\nYou can enter a coin type or a Suiscan link.';

      await ctx.reply(replyText, { reply_markup: closeConversation });

      return false;
    }

    const coinType: string | null = coinTypeIsValid
      ? possibleCoin
      : extractCoinTypeFromLink(possibleCoin);

    // ts check
    if (coinType === null) {
      await ctx.reply(
        'Suiscan link is not valid. Make sure it is correct.\n\nYou can enter a coin type or a Suiscan link.',
        { reply_markup: closeConversation },
      );
      return false;
    }

    const fetchedCoin = await coinManager.getCoinByType2(coinType);

    if (fetchedCoin === null) {
      await ctx.reply(
        `Coin type not found. Make sure type "${coinType}" is correct.\n\nYou can enter a coin type or a Suiscan link.`,
        { reply_markup: closeConversation },
      );

      return false;
    }

    const secondCoinIsSui: boolean =
      swapTokenTypesAreEqual(coinType, LONG_SUI_COIN_TYPE) ||
      swapTokenTypesAreEqual(coinType, SHORT_SUI_COIN_TYPE);
    const firstAndSecondCoinsAreSui = firstCoinIsSui && secondCoinIsSui;
    const firstAndSecondCoinsAreEqual =
      firstAndSecondCoinsAreSui || coinType === firstValidatedCoinToAdd.type;

    if (firstAndSecondCoinsAreEqual) {
      await ctx.reply(
        'The second coin in pool must be not the first one. Please, specify another coin to add in pool.',
        { reply_markup: closeConversation },
      );

      return false;
    }

    const foundCoin = findCoinInAssets(allCoinsAssets, coinType);

    if (foundCoin === undefined) {
      await ctx.reply(
        'Coin is not found in your wallet assets. Please, specify another coin to add in pool.',
        { reply_markup: closeConversation },
      );

      return false;
    }

    secondCoinHasPrice = await AftermathSingleton.coinHasPrice(foundCoin.type);
    console.debug('secondCoinHasPrice:', secondCoinHasPrice);
    if (firstCoinHasPrice && secondCoinHasPrice) {
      const { maxAmountB, minAmountB } =
        await AftermathSingleton.getMaxAndMinSecondCoinAmount({
          coinTypeA: firstValidatedCoinToAdd.type,
          amountA: firstValidatedInputAmount,
          coinTypeB: foundCoin.type,
          decimalsB: fetchedCoin.decimals,
        });

      if (foundCoin.balance < minAmountB) {
        await ctx.reply(
          'You have too small balance of this coin to add it to the pool relative to the amount ' +
            `of the first coin you specified.\n\nTo create a pool with <code>${firstValidatedInputAmount}</code> ` +
            `${firstValidatedCoinToAdd.symbol || firstValidatedCoinToAdd.type} and ` +
            `${foundCoin.symbol || foundCoin.type}, you need at least <code>${minAmountB}</code> ` +
            `${foundCoin.symbol || foundCoin.type}.\n\nPlease, specify another coin to add in pool or top up your ` +
            `${foundCoin.symbol || foundCoin.type} balance.`,
          { reply_markup: closeConversation, parse_mode: 'HTML' },
        );

        return false;
      }

      secondCoinMinAmount = minAmountB;
      secondCoinMaxAmount = maxAmountB;
    }
    console.debug('secondCoinMinAmount:', secondCoinMinAmount);
    console.debug('secondCoinMaxAmount:', secondCoinMaxAmount);

    secondValidatedCoin = foundCoin;
    return true;
  });

  // Note: The following check and type assertion exist due to limitations or issues in TypeScript type checking for this specific case.
  // The if statement is not expected to execute, and the type assertion is used to satisfy TypeScript's type system.
  if (!isCoinAssetData(secondValidatedCoin)) {
    await ctx.reply(
      'Coin is not found in your wallet assets. Please, specify another coin to add in pool.',
      { reply_markup: retryButton },
    );

    return;
  }

  const secondValidatedCoinToAdd = secondValidatedCoin as CoinAssetData;
  console.debug('secondValidatedCoinToAdd:', secondValidatedCoinToAdd);
  const secondCoinIsSui: boolean =
    swapTokenTypesAreEqual(secondValidatedCoinToAdd.type, LONG_SUI_COIN_TYPE) ||
    swapTokenTypesAreEqual(secondValidatedCoinToAdd.type, SHORT_SUI_COIN_TYPE);

  let availableSecondCoinMaxAmount: string;
  if (secondCoinIsSui) {
    const availableBalance = await conversation.external(async () => {
      const walletManager = await getWalletManager();
      // TODO: Maybe we should add try/catch here as well
      const balance = await walletManager.getAvailableSuiBalance(
        ctx.session.publicKey,
      );

      return balance;
    });

    availableSecondCoinMaxAmount = availableBalance;
  } else {
    availableSecondCoinMaxAmount = secondValidatedCoinToAdd.balance;
  }
  console.debug('availableSecondCoinMaxAmount:', availableSecondCoinMaxAmount);

  let resultSecondCoinMinAmount: string, resultSecondCoinMaxAmount: string;
  // We need to make sure that in case both tokens from user input have prices,
  // we can calculate min and max amount user can provide.
  if (secondCoinMinAmount !== undefined && secondCoinMaxAmount !== undefined) {
    resultSecondCoinMinAmount = secondCoinMinAmount;
    resultSecondCoinMaxAmount =
      new BigNumber(availableSecondCoinMaxAmount) <
      new BigNumber(secondCoinMaxAmount)
        ? availableSecondCoinMaxAmount
        : secondCoinMaxAmount;
  } else {
    // In case prices for provided tokens are not available (e.g. it's custom/new tokens),
    // we can set min/max amount depending on user's wallet balance of these tokens.
    resultSecondCoinMinAmount = '0';
    resultSecondCoinMaxAmount = availableSecondCoinMaxAmount;
  }
  console.debug('resultSecondCoinMinAmount:', resultSecondCoinMinAmount);
  console.debug('resultSecondCoinMaxAmount:', resultSecondCoinMaxAmount);

  await ctx.reply(
    `Reply with the amount you wish to add in pool (<code>${resultSecondCoinMinAmount}</code> - <code>${resultSecondCoinMaxAmount}</code> ${secondValidatedCoinToAdd.symbol || secondValidatedCoinToAdd.type}).\n\nExample: <code>0.1</code>`,
    { reply_markup: closeConversation, parse_mode: 'HTML' },
  );

  const secondValidatedInputAmountMessage = await conversation.waitUntil(
    async (ctx) => {
      if (ctx.callbackQuery?.data === 'close-conversation') {
        return false;
      }

      const inputAmount = ctx.msg?.text;

      // ts check
      if (inputAmount === undefined) {
        return false;
      }

      const decimals = secondValidatedCoinToAdd.decimals;
      // ts check
      if (decimals === null) {
        await ctx.reply(
          `Coin decimals not found for ${secondValidatedCoinToAdd.type}. Please, use another coin to add in pool or contact support.`,
          { reply_markup: closeConversation },
        );

        return false;
      }

      // TODO: Re-check this
      const { isValid: amountIsValid, reason } = isValidTokenAmount({
        amount: inputAmount,
        maxAvailableAmount: resultSecondCoinMaxAmount,
        minAvailableAmount: resultSecondCoinMinAmount,
        decimals,
      });

      if (!amountIsValid) {
        await ctx.reply(
          `Invalid amount. Reason: ${reason}\n\nPlease, try again.`,
          { reply_markup: closeConversation },
        );

        return false;
      }

      return true;
    },
  );
  const secondValidatedInputAmount: string | undefined =
    secondValidatedInputAmountMessage.msg?.text;

  // ts check
  if (secondValidatedInputAmount === undefined) {
    await ctx.reply(`Invalid amount.\n\nCannot continue.`, {
      reply_markup: retryButton,
    });
    return;
  }
  console.debug('secondValidatedInputAmount:', secondValidatedInputAmount);

  await ctx.reply(
    'What would be an <b>LP coin name</b>?\n\nExample: <code>My new coin</code>',
    { reply_markup: closeConversation, parse_mode: 'HTML' },
  );

  const lpCoinNameMessage = await conversation.waitFor(':text');
  const lpCoinName = lpCoinNameMessage.msg.text;
  console.debug('lpCoinName:', lpCoinName);

  await ctx.reply(
    'What would be an <b>LP coin symbol</b>?\n\nExample: <code>MY_NEW_COIN</code>',
    { reply_markup: closeConversation, parse_mode: 'HTML' },
  );

  const lpCoinSymbolMessage = await conversation.waitFor(':text');
  const lpCoinSymbol = lpCoinSymbolMessage.msg.text;
  console.debug('lpCoinSymbol:', lpCoinSymbol);

  await ctx.reply(
    'What would be a <b>pool name</b>?\n\nExample: <code>MY_NEW_COIN/USDC</code>',
    { reply_markup: closeConversation, parse_mode: 'HTML' },
  );

  const poolNameMessage = await conversation.waitFor(':text');
  const poolName = poolNameMessage.msg.text;
  console.debug('poolName:', poolName);

  await ctx.reply(
    'What would be a <b>trade fee</b> in percents (%)?\n<span class="tg-spoiler">Max: 10\nMin: 0.01</span>\n\nExample: <code>0.25</code>',
    { reply_markup: closeConversation, parse_mode: 'HTML' },
  );

  const tradeFeeMessage = await conversation.waitUntil(async (ctx) => {
    if (ctx.callbackQuery?.data === 'close-conversation') {
      return false;
    }

    const tradeFee = ctx.msg?.text;

    // ts check
    if (tradeFee === undefined) {
      return false;
    }

    const tradeFeeNumber = parseFloat(tradeFee);
    if (isNaN(tradeFeeNumber)) {
      await ctx.reply('Invalid trade fee. Please, try again.', {
        reply_markup: closeConversation,
      });

      return false;
    }

    const tradeFeeIsValid = tradeFeeNumber >= 0.01 && tradeFeeNumber <= 10;
    if (!tradeFeeIsValid) {
      await ctx.reply(
        'Trade fee must be in the range from <code>0.01</code> to <code>10</code>, inclusive. Please, try again.',
        { reply_markup: closeConversation, parse_mode: 'HTML' },
      );

      return false;
    }

    return true;
  });

  const tradeFeeString: string | undefined = tradeFeeMessage.msg?.text;

  // ts check
  if (tradeFeeString === undefined) {
    await ctx.reply(`Invalid trade fee.\n\nCannot continue.`, {
      reply_markup: retryButton,
    });
    return;
  }
  const tradeFeeIn = new BigNumber(tradeFeeString).dividedBy(100).toNumber();
  console.debug('tradeFeeIn:', tradeFeeIn);

  const lpCoinMetadata = { name: lpCoinName, symbol: lpCoinSymbol };
  console.debug('lpCoinMetadata:', lpCoinMetadata);
  let coinADecimals: number | null = firstValidatedCoinToAdd.decimals;
  console.debug('coinADecimals:', coinADecimals);
  let coinBDecimals: number | null = secondValidatedCoinToAdd.decimals;
  console.debug('coinBDecimals:', coinBDecimals);

  if (coinADecimals === null) {
    console.warn(
      `No decimals for coin ${firstValidatedCoinToAdd.type}, so fetching...`,
    );

    coinADecimals = await conversation.external(async () => {
      const coinMetadata = await coinManager.fetchCoinMetadata(
        firstValidatedCoinToAdd.type,
      );
      const decimals = coinMetadata?.decimals;

      return decimals ?? null;
    });
    console.debug('coinADecimals after fetch:', coinADecimals);

    if (coinADecimals === null) {
      await ctx.reply(
        `Coin decimals not found for ${firstValidatedCoinToAdd.type}. Please, use another coin to add in pool or contact support.`,
        { reply_markup: retryButton },
      );

      return;
    }
  }
  if (coinBDecimals === null) {
    console.warn(
      `No decimals for coin ${secondValidatedCoinToAdd.type}, so fetching...`,
    );

    coinBDecimals = await conversation.external(async () => {
      const coinMetadata = await coinManager.fetchCoinMetadata(
        secondValidatedCoinToAdd.type,
      );
      const decimals = coinMetadata?.decimals;

      return decimals ?? null;
    });
    console.debug('coinBDecimals after fetch:', coinBDecimals);

    if (coinBDecimals === null) {
      await ctx.reply(
        `Coin decimals not found for ${secondValidatedCoinToAdd.type}. Please, use another coin to add in pool or contact support.`,
        { reply_markup: retryButton },
      );

      return;
    }
  }

  await ctx.reply('Calculating weights...');
  const rawAmountA: string = new BigNumber(firstValidatedInputAmount)
    .multipliedBy(10 ** coinADecimals)
    .toString();
  console.debug('rawAmountA:', rawAmountA);
  const rawAmountB: string = new BigNumber(secondValidatedInputAmount)
    .multipliedBy(10 ** coinBDecimals)
    .toString();
  console.debug('rawAmountB:', rawAmountB);
  const amountABigInt = BigInt(rawAmountA);
  console.debug('amountABigInt:', amountABigInt);
  const amountBBigInt = BigInt(rawAmountB);
  console.debug('amountBBigInt:', amountBBigInt);

  const { weightA, weightB } = await conversation.external(() =>
    AftermathSingleton.getWeights({
      coinA: {
        type: firstValidatedCoinToAdd.type,
        amount: firstValidatedInputAmount,
      },
      coinB: {
        type: secondValidatedCoinToAdd.type,
        amount: secondValidatedInputAmount,
      },
    }),
  );
  console.debug('weightA:', weightA);
  console.debug('weightB:', weightB);

  const coinsInfo = {
    coinA: {
      coinType: firstValidatedCoinToAdd.type,
      weight: weightA,
      decimals: coinADecimals,
      tradeFeeIn,
      initialDeposit: amountABigInt,
    },
    coinB: {
      coinType: secondValidatedCoinToAdd.type,
      weight: weightB,
      decimals: coinBDecimals,
      tradeFeeIn,
      initialDeposit: amountBBigInt,
    },
  };
  console.debug('coinsInfo:', coinsInfo);
  const lpCoinDecimals = getLpCoinDecimals(coinsInfo);
  console.debug('lpCoinDecimals:', lpCoinDecimals);

  // Create LP coin
  await ctx.reply('Creating LP coin...');
  const createLpCoinTransaction = await conversation.external({
    task: async () => {
      try {
        const createLpCoinTransaction =
          await AftermathSingleton.getCreateLpCoinTransaction({
            publicKey: ctx.session.publicKey,
            lpCoinDecimals,
          });

        return createLpCoinTransaction;
      } catch (error) {
        console.error(error);

        if (error instanceof Error) {
          console.error(
            `[AftermathSingleton.getCreateLpCoinTransaction] failed to create LP coin transaction: ${error.message}`,
          );
        } else {
          console.error(
            `[AftermathSingleton.getCreateLpCoinTransaction] failed to create LP coin transaction: ${error}`,
          );
        }

        return;
      }
    },
    // TODO: Move that tx boilerplate to util func
    beforeStore: (value) => {
      if (value) {
        return value.serialize();
      }
    },
    afterLoad: async (value) => {
      if (value) {
        return transactionFromSerializedTransaction(value);
      }
    },
    afterLoadError: async (error) => {
      console.debug(
        `Error in afterLoadError for ${ctx.from?.username} and instance ${random_uuid}`,
      );
      console.error(error);
    },
    beforeStoreError: async (error) => {
      console.debug(
        `Error in beforeStoreError for ${ctx.from?.username} and instance ${random_uuid}`,
      );
      console.error(error);
    },
  });

  if (!createLpCoinTransaction) {
    await ctx.reply('Create LP coin transaction creation failed.', {
      reply_markup: retryButton,
    });

    return;
  }

  const resultOfCreateLpCoin: {
    createLpCoinResult?: SuiTransactionBlockResponse;
    digest?: string;
    resultStatus: TransactionResultStatus;
    reason?: string;
  } = await conversation.external(async () => {
    try {
      const createLpCoinResult = await provider.signAndExecuteTransactionBlock({
        transactionBlock: createLpCoinTransaction,
        signer: WalletManagerSingleton.getKeyPairFromPrivateKey(
          ctx.session.privateKey,
        ),
        options: {
          showEvents: true,
          showBalanceChanges: true,
          showEffects: true,
          showObjectChanges: true,
        },
        requestType: 'WaitForLocalExecution',
      });

      const isTransactionResultSuccessful =
        isTransactionSuccessful(createLpCoinResult);

      const resultStatus = isTransactionResultSuccessful
        ? TransactionResultStatus.Success
        : TransactionResultStatus.Failure;

      return {
        createLpCoinResult,
        resultStatus,
        digest: createLpCoinResult.digest,
      };
    } catch (error) {
      if (error instanceof Error) {
        console.error(
          `[provider.signAndExecuteTransactionBlock] failed to send transaction: ${error.message}`,
        );
      } else {
        console.error(
          `[provider.signAndExecuteTransactionBlock] failed to send transaction: ${error}`,
        );
      }

      const resultStatus = TransactionResultStatus.Failure;
      return { resultStatus, reason: 'failed_to_send_transaction' };
    }
  });

  if (
    resultOfCreateLpCoin.resultStatus === 'failure' &&
    resultOfCreateLpCoin.createLpCoinResult &&
    resultOfCreateLpCoin.digest
  ) {
    await ctx.reply(
      `LP coin creation failed.\n\nhttps://suiscan.xyz/mainnet/tx/${resultOfCreateLpCoin.digest}`,
      { reply_markup: retryButton },
    );

    return;
  }

  if (
    resultOfCreateLpCoin.resultStatus === 'failure' &&
    resultOfCreateLpCoin.reason
  ) {
    await ctx.reply('Failed to send transaction for LP coin creation.', {
      reply_markup: retryButton,
    });

    return;
  }

  const { createLpCoinResult } = resultOfCreateLpCoin;

  // ts check
  if (createLpCoinResult === undefined) {
    await ctx.reply(`LP coin creation failed.`, { reply_markup: retryButton });

    return;
  }

  await ctx.reply(
    'Waiting for the LP coin to gain a foothold in the blockchain...',
  );
  // This is workaround until we are limited by Aftermath API for creating the transactions
  await conversation.external(() => sleep(5000));

  // Create pool
  await ctx.reply('Creating the pool...');
  const createPoolTransaction = await conversation.external({
    task: async () => {
      try {
        const createPoolTransaction =
          await AftermathSingleton.getCreatePoolTransaction({
            publicKey: ctx.session.publicKey,
            createLpCoinTransactionResult: createLpCoinResult,
            poolName,
            coinsInfo,
            lpCoinMetadata,
          });

        return createPoolTransaction;
      } catch (error) {
        console.error(error);

        if (error instanceof Error) {
          console.error(
            `[AftermathSingleton.getCreatePoolTransaction] failed to create pool creation transaction: ${error.message}`,
          );
        } else {
          console.error(
            `[AftermathSingleton.getCreatePoolTransaction] failed to create pool creation transaction: ${error}`,
          );
        }

        return;
      }
    },
    beforeStore: (value) => {
      if (value) {
        return value.serialize();
      }
    },
    afterLoad: async (value) => {
      if (value) {
        return transactionFromSerializedTransaction(value);
      }
    },
    afterLoadError: async (error) => {
      console.debug(
        `Error in afterLoadError for ${ctx.from?.username} and instance ${random_uuid}`,
      );
      console.error(error);
    },
    beforeStoreError: async (error) => {
      console.debug(
        `Error in beforeStoreError for ${ctx.from?.username} and instance ${random_uuid}`,
      );
      console.error(error);
    },
  });

  if (!createPoolTransaction) {
    await ctx.reply(
      'Create pool transaction creation failed. Try to use different coin amounts or contact support.',
      {
        reply_markup: retryButton,
      },
    );

    return;
  }

  const resultOfCreatePool: {
    createPoolResult?: SuiTransactionBlockResponse;
    digest?: string;
    resultStatus: TransactionResultStatus;
    reason?: string;
  } = await conversation.external(async () => {
    try {
      const createPoolResult = await provider.signAndExecuteTransactionBlock({
        transactionBlock: createPoolTransaction,
        signer: WalletManagerSingleton.getKeyPairFromPrivateKey(
          ctx.session.privateKey,
        ),
        options: {
          showEvents: true,
          showBalanceChanges: true,
          showEffects: true,
          showObjectChanges: true,
        },
        requestType: 'WaitForLocalExecution',
      });

      const isTransactionResultSuccessful =
        isTransactionSuccessful(createPoolResult);

      const resultStatus = isTransactionResultSuccessful
        ? TransactionResultStatus.Success
        : TransactionResultStatus.Failure;

      return {
        createPoolResult,
        resultStatus,
        digest: createPoolResult.digest,
      };
    } catch (error) {
      if (error instanceof Error) {
        console.error(
          `[provider.signAndExecuteTransactionBlock] failed to send transaction: ${error.message}`,
        );
      } else {
        console.error(
          `[provider.signAndExecuteTransactionBlock] failed to send transaction: ${error}`,
        );
      }

      const resultStatus = TransactionResultStatus.Failure;
      return { resultStatus, reason: 'failed_to_send_transaction' };
    }
  });

  if (
    resultOfCreatePool.resultStatus === 'failure' &&
    resultOfCreatePool.createPoolResult &&
    resultOfCreatePool.digest
  ) {
    await ctx.reply(
      `Pool creation failed.\n\nhttps://suiscan.xyz/mainnet/tx/${resultOfCreatePool.digest}`,
      { reply_markup: retryButton },
    );

    return;
  }

  if (
    resultOfCreatePool.resultStatus === 'failure' &&
    resultOfCreatePool.reason
  ) {
    await ctx.reply('Failed to send transaction for pool creation.', {
      reply_markup: retryButton,
    });

    return;
  }

  const { createPoolResult } = resultOfCreatePool;

  // ts check
  if (createPoolResult === undefined) {
    await ctx.reply(`Pool creation failed.`, { reply_markup: retryButton });

    return;
  }

  const poolUrl = AftermathSingleton.getPoolUrl(createPoolResult);
  await ctx.reply(`Pool is successfully created!\n\n${poolUrl}`, {
    reply_markup: retryButton,
  });

  return;
}

export async function createCoin(
  conversation: MyConversation,
  ctx: BotContext,
): Promise<void> {
  const skipButton = skip.inline_keyboard[0];
  const retryButton = retryAndGoHomeButtonsData[ConversationId.CreateCoin];
  const closeWithSkipReplyMarkup = closeConversation.clone().add(...skipButton);

  const suiBalance = await balance(ctx);
  if (new BigNumber(suiBalance) < new BigNumber(1)) {
    await ctx.reply(
      'Please, top up your <b>SUI</b> balance. You need at least <code>1</code> ' +
        '<b>SUI</b> to create a coin.',
      { reply_markup: retryButton, parse_mode: 'HTML' },
    );

    return;
  }

  await ctx.reply(
    'What would be a <b>coin name</b>?\n\nExample: <code>My Awesome Coin</code>\n\n<span class="tg-spoiler">' +
      '<b>Hint</b>: Coin name is a metadata info, which represents the name of your coin on SUI explorers.</span>',
    { parse_mode: 'HTML', reply_markup: closeConversation },
  );

  const coinNameMessage = await conversation.waitUntil(async (ctx) => {
    if (ctx.callbackQuery?.data === 'close-conversation') {
      return false;
    }

    const isCoinNameValid = validateCoinName(ctx.msg?.text ?? '');

    if (!isCoinNameValid) {
      await ctx.reply('Coin name is not valid. Please, specify valid name.', {
        reply_markup: closeConversation,
      });

      return false;
    }

    return isCoinNameValid;
  });
  const coinName = coinNameMessage.msg?.text?.trim();

  // ts-check
  if (coinName === undefined) {
    await ctx.reply(`Coin name is not correct.\n\nCannot continue.`, {
      reply_markup: retryButton,
    });

    return;
  }
  // console.debug('coinName:', coinName);

  await ctx.reply(
    'What would be a <b>coin symbol</b>?\n\nExample: <code>MY_AWESOME_COIN</code>, or just <code>AWESOME</code>\n\n<span class="tg-spoiler">' +
      '<b>Hint</b>: Coin symbol is used in coin type of your coin, for instance:\n\n0x4fab7b26dbbf' +
      '679a33970de7ec59520d76c23b69055ebbd83a3e546b6370e5d1::awesome::<u>AWESOME</u>\n\n' +
      '<u>AWESOME</u> here is the coin symbol.</span>',
    { parse_mode: 'HTML', reply_markup: closeConversation },
  );

  const coinSymbolMessage = await conversation.waitUntil(async (ctx) => {
    if (ctx.callbackQuery?.data === 'close-conversation') {
      return false;
    }

    const isCoinSymbolValid = validateCoinSymbol(ctx.msg?.text ?? '');

    if (!isCoinSymbolValid) {
      await ctx.reply(
        'Coin symbol is not valid. Please, specify valid symbol.',
        {
          reply_markup: closeConversation,
        },
      );

      return false;
    }

    return isCoinSymbolValid;
  });
  const coinSymbol = coinSymbolMessage.msg?.text?.trim();

  // ts-check
  if (coinSymbol === undefined) {
    await ctx.reply(`Coin symbol is not correct.\n\nCannot continue.`, {
      reply_markup: retryButton,
    });

    return;
  }
  console.debug('coinSymbol:', coinSymbol);

  await ctx.reply(
    'What would be a <b>coin description</b>?\n\nExample: <code>Some description about my awesome coin</code>',
    {
      parse_mode: 'HTML',
      reply_markup: closeWithSkipReplyMarkup,
    },
  );

  const coinDescriptionMessage = await conversation.waitUntil(async (ctx) => {
    if (ctx.callbackQuery?.data === 'close-conversation') {
      return false;
    }
    if (ctx.callbackQuery?.data === 'skip') {
      await ctx.answerCallbackQuery();
      return true;
    }

    const isCoinDescriptionIsValid = validateCoinDescription(
      ctx.msg?.text ?? '',
    );

    if (!isCoinDescriptionIsValid) {
      await ctx.reply(
        'Coin description is not valid. Please, specify valid description.',
        {
          reply_markup: closeConversation,
        },
      );

      return false;
    }

    return isCoinDescriptionIsValid;
  });
  const coinDescription =
    coinDescriptionMessage.callbackQuery?.data === 'skip'
      ? ''
      : coinDescriptionMessage.msg?.text?.trim();

  // ts-check
  if (coinDescription === undefined) {
    await ctx.reply(`Coin description is not correct.\n\nCannot continue.`, {
      reply_markup: retryButton,
    });

    return;
  }
  // console.debug('coinDescription:', coinDescription);

  await ctx.reply(
    'Send a <b>coin image</b>.\n\n<b>Suggestions</b>:\n1. The coin image should be ' +
      'square (<b>height = width</b>).\n2. <b>Use Telegram Image Compression</b>. If your ' +
      'image does not exceed the size of 320x320 pixels, no quality changes will occur.',
    {
      reply_markup: closeWithSkipReplyMarkup,
      parse_mode: 'HTML',
    },
  );

  const imagesDataMessage = await conversation.waitUntil(async (ctx) => {
    if (ctx.callbackQuery?.data === 'close-conversation') {
      return false;
    }
    if (ctx.callbackQuery?.data === 'skip') {
      await ctx.answerCallbackQuery();
      return true;
    }

    const imagesData = ctx.msg?.photo;

    if (imagesData === undefined) {
      await ctx.reply(
        'Invalid coin image. Please, send another image.\n\n<span class="tg-spoiler"><b>Hint</b>: If you are ' +
          'sending an image as a file (without compression), consider sending it with compression. If your ' +
          'image does not exceed the size of 320x320 pixels, no quality changes will occur.</span>',
        {
          reply_markup: closeWithSkipReplyMarkup,
          parse_mode: 'HTML',
        },
      );

      return false;
    }

    if (imagesData[0].height !== imagesData[0].width) {
      await ctx.reply(
        'The coin image should be square (<b>height = width</b>). Please, send another image.',
        {
          reply_markup: closeWithSkipReplyMarkup,
          parse_mode: 'HTML',
        },
      );

      return false;
    }

    return true;
  });

  let coinImageBase64: string;
  if (imagesDataMessage.callbackQuery?.data === 'skip') {
    coinImageBase64 = '';
  } else {
    const imagesData = imagesDataMessage.msg?.photo;

    // ts check
    if (imagesData === undefined) {
      await ctx.reply('The coin image is not valid.\n\nCannot continue.', {
        reply_markup: retryButton,
      });

      return;
    }
    // console.debug('imagesData:', imagesData);

    const suitableImageData = getSuitableCoinImageData(imagesData);
    // console.debug('suitableImageData:', suitableImageData);
    const file = await ctx.api.getFile(suitableImageData.file_id);
    // console.debug('file:', file);
    const imageDownloadUrl = getTelegramFileUrl(file);
    // console.debug('imageDownloadUrl:', imageDownloadUrl);

    try {
      coinImageBase64 = await conversation.external(() =>
        imageUrlToBase64(imageDownloadUrl),
      );
    } catch (error) {
      console.error(error);

      await ctx.reply(
        'Cannot process sent image. Please, use another image or contact support.',
        { reply_markup: retryButton },
      );

      return;
    }
  }
  // console.debug('coinImageBase64:', coinImageBase64);

  await ctx.reply(
    'Enter <b>coin decimals</b>.\n\n<b>Default</b>: <code>9</code>\n' +
      '<b>Note</b>: Valid range for decimals is between <code>0</code> and <code>11</code>\n\n' +
      '<span class="tg-spoiler"><b>Hint</b>: If you don\'t ' +
      'know what to enter, just skip this step.</span>\n\n' +
      '<span class="tg-spoiler">You should be aware, that the higher coin decimals you\'ll choose, the less total ' +
      'supply you can use.\n\n' +
      '<b>Example</b>:\n11 decimals &#8213; 99,999,999 total supply\n10 decimals ' +
      '&#8213; 999,999,999 total supply</span>',
    { parse_mode: 'HTML', reply_markup: closeWithSkipReplyMarkup },
  );

  const coinDecimalsMessage = await conversation.waitUntil(async (ctx) => {
    if (ctx.callbackQuery?.data === 'close-conversation') {
      return false;
    }
    if (ctx.callbackQuery?.data === 'skip') {
      await ctx.answerCallbackQuery();
      return true;
    }

    const isCoinDecimalsIsValid = validateCoinDecimals(ctx.msg?.text ?? '');

    if (!isCoinDecimalsIsValid) {
      await ctx.reply(
        'Coin decimals are not valid. Please, specify valid decimals.',
        { reply_markup: closeWithSkipReplyMarkup },
      );

      return false;
    }

    return isCoinDecimalsIsValid;
  });
  const defaultDecimals = '9';
  const coinDecimals =
    coinDecimalsMessage.callbackQuery?.data === 'skip'
      ? defaultDecimals
      : coinDecimalsMessage.msg?.text;

  // ts-check
  if (coinDecimals === undefined) {
    await ctx.reply(`Coin decimals is not correct.\n\nCannot continue.`, {
      reply_markup: retryButton,
    });

    return;
  }
  // console.debug('coinDecimals:', coinDecimals);

  const maxTotalSupply = calculateMaxTotalSupply(coinDecimals);

  await ctx.reply(
    'Enter <b>total supply</b>.\n\n<b>Example</b>: <code>1000000</code>\n\n' +
      '<b>Hint</b>: Max total supply for selected decimals ' +
      `(<code>${coinDecimals}</code>) is <code>${maxTotalSupply}</code>`,
    { parse_mode: 'HTML', reply_markup: closeConversation },
  );

  const totalSupplyMessage = await conversation.waitUntil(async (ctx) => {
    if (ctx.callbackQuery?.data === 'close-conversation') {
      return false;
    }

    const isTotalSupplyIsValid = validateTotalSupply(
      ctx.msg?.text ?? '',
      maxTotalSupply,
    );

    if (!isTotalSupplyIsValid) {
      await ctx.reply(
        'Coin total supply is not valid. Please, specify valid supply.',
        {
          reply_markup: closeConversation,
        },
      );

      return false;
    }

    return isTotalSupplyIsValid;
  });
  const totalSupply = totalSupplyMessage.msg?.text;

  // ts-check
  if (totalSupply === undefined) {
    await ctx.reply(`Total supply is not correct.\n\nCannot continue.`, {
      reply_markup: retryButton,
    });

    return;
  }
  // console.debug('totalSupply:', totalSupply);

  const closeButton = closeConversation.inline_keyboard[0];
  const yesOrNoWithCancelReplyMarkup = yesOrNo.clone().add(...closeButton);
  await ctx.reply(
    'Would supply be <b>fixed</b>?\n\n<span class="tg-spoiler"><b>Hint</b>:\nYes &#8213; Treasury Cap ' +
      'will be sent to the burn address (0x0 address).\nNo &#8213; Treasury Cap will be sent to you.</span>',
    { parse_mode: 'HTML', reply_markup: yesOrNoWithCancelReplyMarkup },
  );

  const fixedSupplyMessage = await conversation.waitUntil(async (ctx) => {
    if (ctx.callbackQuery?.data === 'close-conversation') {
      return false;
    }
    if (ctx.callbackQuery?.data === 'yes') {
      await ctx.answerCallbackQuery();
      return true;
    }
    if (ctx.callbackQuery?.data === 'no') {
      await ctx.answerCallbackQuery();
      return true;
    }

    await ctx.reply('Please, click on the button.', {
      reply_markup: closeConversation,
    });

    return false;
  });
  const fixedSupplyAnswer = fixedSupplyMessage.callbackQuery?.data;

  // ts-check
  if (fixedSupplyAnswer === undefined) {
    await ctx.reply(`Fixed supply answer is not correct.\n\nCannot continue.`, {
      reply_markup: retryButton,
    });

    return;
  }

  const fixedSupply = fixedSupplyAnswer === 'yes';
  // console.debug('fixedSupply:', fixedSupply);

  await ctx.reply('Creating the coin transaction...');
  const createCoinTransaction = await conversation.external({
    task: async () => {
      try {
        const createCoinTx =
          await CoinManagerSingleton.getCreateCoinTransaction({
            name: coinName,
            symbol: coinSymbol,
            decimals: coinDecimals,
            fixedSupply: fixedSupply,
            description: coinDescription,
            mintAmount: totalSupply,
            url: coinImageBase64,
            signerAddress: ctx.session.publicKey,
          });

        return createCoinTx;
      } catch (error) {
        console.error(error);

        if (error instanceof Error) {
          console.error(
            `[CoinManagerSingleton.getCreateCoinTransaction] failed to create pool creation transaction: ${error.message}`,
          );
        } else {
          console.error(
            `[CoinManagerSingleton.getCreateCoinTransaction] failed to create pool creation transaction: ${error}`,
          );
        }

        return;
      }
    },
    beforeStore: (value) => {
      if (value) {
        return value.serialize();
      }
    },
    afterLoad: async (value) => {
      if (value) {
        return transactionFromSerializedTransaction(value);
      }
    },
    afterLoadError: async (error) => {
      console.debug(
        `Error in afterLoadError for ${ctx.from?.username} and instance ${random_uuid}`,
      );
      console.error(error);
    },
    beforeStoreError: async (error) => {
      console.debug(
        `Error in beforeStoreError for ${ctx.from?.username} and instance ${random_uuid}`,
      );
      console.error(error);
    },
  });

  if (!createCoinTransaction) {
    await ctx.reply(
      'Create coin transaction creation failed. Try to use different coin params or contact support.',
      {
        reply_markup: retryButton,
      },
    );

    return;
  }

  const resultOfCreateCoin: {
    createCoinResult?: SuiTransactionBlockResponse;
    digest?: string;
    result: TransactionResultStatus;
    reason?: string;
  } = await conversation.external(async () => {
    try {
      const createCoinResult = await provider.signAndExecuteTransactionBlock({
        transactionBlock: createCoinTransaction,
        signer: WalletManagerSingleton.getKeyPairFromPrivateKey(
          ctx.session.privateKey,
        ),
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      });

      const isTransactionResultSuccessful =
        isTransactionSuccessful(createCoinResult);
      const result = isTransactionResultSuccessful
        ? TransactionResultStatus.Success
        : TransactionResultStatus.Failure;

      return { createCoinResult, digest: createCoinResult.digest, result };
    } catch (error) {
      if (error instanceof Error) {
        console.error(
          `[provider.signAndExecuteTransactionBlock] failed to send transaction: ${error.message}`,
        );
      } else {
        console.error(
          `[provider.signAndExecuteTransactionBlock] failed to send transaction: ${error}`,
        );
      }

      const result = TransactionResultStatus.Failure;
      return { result: result, reason: 'failed_to_send_transaction' };
    }
  });

  if (
    resultOfCreateCoin.result === 'failure' &&
    resultOfCreateCoin.createCoinResult &&
    resultOfCreateCoin.digest
  ) {
    await ctx.reply(
      `Coin creation failed.\n\nhttps://suiscan.xyz/mainnet/tx/${resultOfCreateCoin.digest}`,
      { reply_markup: retryButton },
    );

    return;
  }

  const { createCoinResult } = resultOfCreateCoin;

  // ts check
  if (createCoinResult === undefined) {
    await ctx.reply(`Coin creation failed.`, { reply_markup: retryButton });

    return;
  }

  if (resultOfCreateCoin.result === 'success' && resultOfCreateCoin.digest) {
    const coinType = getCoinTypeFromTransactionResult(createCoinResult);

    await ctx.reply(
      `Coin created!\n\nhttps://suiscan.xyz/mainnet/coin/${coinType}`,
      { reply_markup: retryButton },
    );

    return;
  }

  await ctx.reply('Transaction sending failed.', { reply_markup: retryButton });
}

export async function ownedAftermathPools(ctx: BotContext) {
  const loadingMessage = await ctx.reply('<b>Loading...</b>', {
    parse_mode: 'HTML',
  });

  const walletManager = await getWalletManager();
  const coinManager = await getCoinManager();
  const allAssets = await walletManager.getAllCoinAssets(ctx.session.publicKey);
  const ownedPoolInfos = await AftermathSingleton.getOwnedPoolsInfo(
    allAssets,
    coinManager,
  );

  if (ownedPoolInfos.length === 0) {
    await ctx.api.editMessageText(
      loadingMessage.chat.id,
      loadingMessage.message_id,
      'You have no pools yet.',
      { reply_markup: goHome },
    );

    return;
  }

  let infoString = '<b>Owned Pools</b>:';
  ownedPoolInfos.forEach((poolInfo) => {
    const poolLink = getAftermathPoolLink(poolInfo.poolObjectId);

    infoString += `\n\nName: <a href="${poolLink}"><b>${poolInfo.name}</b></a>\n`;
    infoString += `TVL: <code>${poolInfo.tvl}</code>\n`;
    infoString += `Volume: <code>${poolInfo.volume}</code>\n`;
    infoString += `APR: <code>${poolInfo.apr}</code>\n`;
    infoString += `Fees: <code>${poolInfo.fees}</code>\n`;
    infoString += 'Balances: ';

    poolInfo.coins.forEach((coin) => {
      const suiVisionCoinLink = getSuiVisionCoinLink(coin.type);
      infoString += `<code>${coin.balance}</code> <a href='${suiVisionCoinLink}'>${coin.symbol || coin.type}</a> + `;
    });

    infoString = infoString.substring(0, infoString.length - 3);
  });

  await ctx.api.editMessageText(
    loadingMessage.chat.id,
    loadingMessage.message_id,
    infoString,
    {
      reply_markup: goHome,
      parse_mode: 'HTML',
    },
  );
}
