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
  getSuiProvider,
  isValidSuiAddress,
  isValidTokenAddress,
  isValidTokenAmount,
  transactionFromSerializedTransaction,
} from '@avernikoz/rinbot-sui-sdk';
import { v4 as uuidv4 } from 'uuid';
import { getRedisClient } from '../config/redis.config';
import closeConversation from '../inline-keyboards/closeConversation';
import goHome from '../inline-keyboards/goHome';
import menu from '../menu/main';
import { nft_menu, nft_exit_menu } from '../menu/nft';
import positions_menu from '../menu/positions';
import { BotContext, MyConversation } from '../types';
import {
  SUI_LIQUIDITY_PROVIDERS_CACHE_OPTIONS,
  SUI_PROVIDER_URL,
} from './sui.config';
import {
  extractCoinTypeFromLink,
  getCurrentTime,
  isCoinAssetData,
  isTransactionSuccessful,
  isValidCoinLink,
  swapTokenTypesAreEqual,
} from './utils';

enum TransactionResultStatus {
  Success = 'success',
  Failure = 'failure',
}

const random_uuid = process.env.DEBUG_INSTANCE_ID ? uuidv4() : '';

const provider = getSuiProvider({ url: SUI_PROVIDER_URL });

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
  ]);

  const coinManager = CoinManagerSingleton.getInstance(providers);
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
  ]);

  const routerManager = RouteManager.getInstance(providers, coinManager);
  // console.timeEnd(`RouteManager.getInstance.${random_uuid}`)
  return routerManager;
};

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

    let coinToBuy: CommonCoinData;
    try {
      coinToBuy = coinManager.getCoinByType(coinType);
    } catch (e) {
      console.error(`Token ${coinType} not found in coinManager`);

      await ctx.reply(
        `Token address not found. Make sure address "${coinType}" is correct.\n\nYou can enter a token address or a Suiscan link.`,
        { reply_markup: closeConversation },
      );

      return false;
    }

    if (!coinToBuy) {
      await ctx.reply(
        `Token address not found. Make sure address "${coinType}" is correct.\n\nYou can enter a token address or a Suiscan link.`,
        { reply_markup: closeConversation },
      );

      return false;
    }

    const tokenToBuyIsSui: boolean =
      swapTokenTypesAreEqual(coinToBuy.type, LONG_SUI_COIN_TYPE) ||
      swapTokenTypesAreEqual(coinToBuy.type, SHORT_SUI_COIN_TYPE);

    if (tokenToBuyIsSui) {
      await ctx.reply(
        `You cannot buy SUI for SUI. Please, specify another token to buy.`,
        { reply_markup: closeConversation },
      );

      return false;
    }

    validatedCoinType = coinToBuy.type;
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
    `Reply with the amount you wish to withdraw (<code>0</code> - <code>${availableBalance}</code> SUI).\n\nExample: <code>0.1</code>`,
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
      { reply_markup: goHome },
    );

    return;
  }

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
          slippagePercentage: 10,
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
    await ctx.reply('Transaction creation failed.', { reply_markup: goHome });

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
      { reply_markup: goHome },
    );

    return;
  }

  if (resultOfSwap.result === 'failure' && resultOfSwap.digest) {
    await ctx.reply(
      `Swap failed.\n\nhttps://suiscan.xyz/mainnet/tx/${resultOfSwap.digest}`,
      { reply_markup: goHome },
    );

    return;
  }

  await ctx.reply('Transaction sending failed.', { reply_markup: goHome });
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

  if (!isAmountSuiAmountIsValid) {
    await ctx.reply(
      "You don't have enough SUI for transaction gas. Please, top up your SUI balance to continue.",
      { reply_markup: goHome },
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

    let coinToSell: CommonCoinData;
    try {
      coinToSell = coinManager.getCoinByType(coinType);
    } catch (e) {
      console.error(`Token ${coinType} not found in coinManager`);

      await ctx.reply(
        // eslint-disable-next-line max-len
        `Token address not found. Make sure address "${coinType}" is correct.\n\nYou can enter a token address or a Suiscan link.`,
        { reply_markup: closeConversation },
      );

      return false;
    }

    if (!coinToSell) {
      await ctx.reply(
        // eslint-disable-next-line max-len
        `Token address not found. Make sure address "${coinType}" is correct.\n\nYou can enter a token address or a Suiscan link.`,
        { reply_markup: closeConversation },
      );

      return false;
    }

    if (coinToSell.decimals === null) {
      await ctx.reply(
        `Token decimals not found for ${coinType}. Please, use another token for sell or contact support.`,
        { reply_markup: closeConversation },
      );

      return false;
    }

    const tokenToSellIsSui: boolean =
      swapTokenTypesAreEqual(coinToSell.type, LONG_SUI_COIN_TYPE) ||
      swapTokenTypesAreEqual(coinToSell.type, SHORT_SUI_COIN_TYPE);

    if (tokenToSellIsSui) {
      await ctx.reply(
        `You cannot sell SUI for SUI. Please, specify another token to sell.`,
        { reply_markup: closeConversation },
      );

      return false;
    }

    const foundCoin = allCoinsAssets.find((el) => el.type === coinType);

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
      { reply_markup: goHome },
    );

    return;
  }

  const validCoinToSell = validatedCoin as CoinAssetData;

  await ctx.reply(
    `Reply with the amount you wish to withdraw (<code>0</code> - <code>${validCoinToSell.balance}</code> ${validCoinToSell.symbol || validCoinToSell.type}).\n\nExample: <code>0.1</code>`,
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
          slippagePercentage: ctx.session?.settings?.slippagePercentage || 10,
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
    await ctx.reply('Transaction creation failed', { reply_markup: goHome });

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
      { reply_markup: goHome },
    );

    return;
  }

  if (resultOfSwap.result === 'failure' && resultOfSwap.digest) {
    await ctx.reply(
      `Swap failed.\n\nhttps://suiscan.xyz/mainnet/tx/${resultOfSwap.digest}`,
      { reply_markup: goHome },
    );

    return;
  }

  await ctx.reply('Transaction sending failed.', { reply_markup: goHome });
}

export async function exportPrivateKey(
  conversation: MyConversation,
  ctx: BotContext,
): Promise<void> {
  await ctx.reply(
    `Are you sure want to export private key? Please type <code>CONFIRM</code> if yes.`,
    { reply_markup: closeConversation, parse_mode: 'HTML' },
  );

  const messageData = await conversation.waitFor(':text');
  const isExportConfirmed = messageData.msg.text === 'CONFIRM';

  if (!isExportConfirmed) {
    await ctx.reply(
      `You've not typed CONFIRM. Ignoring your request of exporting private key.`,
      { reply_markup: goHome },
    );

    return;
  }

  await ctx.reply(
    `Your private key is: <code>${ctx.session.privateKey}</code>\n\nYou can now i.e. import the key into a wallet like Suiet.\nDelete this message once you are done.`,
    { parse_mode: 'HTML', reply_markup: goHome },
  );
}

export async function withdraw(
  conversation: MyConversation,
  ctx: BotContext,
): Promise<void> {
  await ctx.reply(
    `Please, type the address to which you would like to send your SUI.`,
    { reply_markup: closeConversation },
  );

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
  const { availableAmount, totalGasFee } =
    await walletManager.getAvailableWithdrawSuiAmount(ctx.session.publicKey);

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
      reply_markup: goHome,
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

    await ctx.reply('Transaction creation failed :(', { reply_markup: goHome });

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
        { reply_markup: goHome },
      );

      return;
    }

    await ctx.reply(
      `Withdraw successful!\n\nhttps://suiscan.xyz/mainnet/tx/${res.digest}`,
      { reply_markup: goHome },
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

    await ctx.reply('Transaction sending failed :(', { reply_markup: goHome });

    return;
  }
}

export async function availableBalance(ctx: any): Promise<string> {
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
    const allCoinsAssets = await walletManager.getAllCoinAssets(
      ctx.session.publicKey,
    );

    ctx.session.assets = allCoinsAssets;

    if (allCoinsAssets?.length === 0) {
      ctx.reply(`Your have no tokens yet.`, { reply_markup: goHome });
      return;
    }
    const assetsString = allCoinsAssets?.reduce((acc, el) => {
      acc = acc.concat(
        `Token: <b>${el.symbol || el.type}</b>\nType: <code>${el.type}</code>\nAmount: <code>${el.balance}</code>\n\n`,
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
  // Send the menu.
  const userBalance = await balance(ctx);
  const avl_balance = await availableBalance(ctx);
  const welcome_text = `<b>Welcome to RINbot on Sui Network</b>\n\nYour wallet address: <code>${ctx.session.publicKey}</code> \nYour SUI balance: <code>${userBalance}</code>\nYour available SUI balance: <code>${avl_balance}</code>`;
  await ctx.reply(welcome_text, { reply_markup: menu, parse_mode: 'HTML' });
}
export async function nftHome(ctx: BotContext) {
  await ctx.reply('<b>Welcome to NFT menu!</b>\n\nPlease check the options below.', {parse_mode: "HTML", reply_markup: nft_menu})
}
