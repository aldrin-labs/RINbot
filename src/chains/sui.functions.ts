import { AftermathSingleton, CetusSingleton, CoinManagerSingleton, CommonCoinData, FlowxSingleton, LONG_SUI_COIN_TYPE, RouteManager, SHORT_SUI_COIN_TYPE, SUI_DECIMALS, TurbosSingleton, WalletManagerSingleton, clmmMainnet, getSuiProvider, isValidSuiAddress, isValidTokenAddress, isValidTokenAmount } from "@avernikoz/rinbot-sui-sdk";
import { BotContext, MyConversation } from "../types";
import positions_menu from "../menu/positions";

import { extractCoinTypeFromLink, isValidCoinLink, swapTokenTypesAreEqual } from './utils';
import { SUI_LIQUIDITY_PROVIDERS_CACHE_OPTIONS, SUI_PROVIDER_URL } from "./sui.config";
import menu from "../menu/main";

const provider = getSuiProvider({ url: SUI_PROVIDER_URL });


export const getTurbos = async () => {
   const turbos = await TurbosSingleton.getInstance({
        suiProviderUrl: SUI_PROVIDER_URL,
        cacheOptions: SUI_LIQUIDITY_PROVIDERS_CACHE_OPTIONS,
      });

    return turbos
}

export const getFlowx = async () => {
    const flowx =  await FlowxSingleton.getInstance({
        cacheOptions: SUI_LIQUIDITY_PROVIDERS_CACHE_OPTIONS,
       });
 
    return flowx
}

export const getCetus = async () => {
    const cetus = await CetusSingleton.getInstance({
        suiProviderUrl: SUI_PROVIDER_URL,
        sdkOptions: clmmMainnet,
        cacheOptions: SUI_LIQUIDITY_PROVIDERS_CACHE_OPTIONS,
      });

    return cetus
}

export const getAftermath = async () => {
    const aftermath = await AftermathSingleton.getInstance({
        cacheOptions: SUI_LIQUIDITY_PROVIDERS_CACHE_OPTIONS,
      });

    return aftermath
}

export const getCoinManager = async () => {
    const providers = await Promise.all([getAftermath(), getCetus(), getTurbos()])

    const coinManager = CoinManagerSingleton.getInstance(providers);

    return coinManager
}

export const getWalletManager = async () => {
    const coinManager = await getCoinManager()

    const walletManager = WalletManagerSingleton.getInstance(provider, coinManager);

    return walletManager
}

export const getRouteManager = async () => {
    const coinManager = await getCoinManager()
    const providers = await Promise.all([getAftermath(), getCetus(), getTurbos()])

    const routerManager = RouteManager.getInstance(providers, coinManager);

    return routerManager
}


export async function buy(conversation: MyConversation, ctx: BotContext) {
    await ctx.reply(
      'Which token do you want to buy? Please send a coin type or a link to suiscan.',
    );

    await ctx.reply(
      'Example of coin type format:\n0x76cb819b01abed502bee8a702b4c2d547532c12f25001c9dea795a5e631c26f1::fud::FUD\nExample of suiscan link:\nhttps://suiscan.xyz/mainnet/coin/0x76cb819b01abed502bee8a702b4c2d547532c12f25001c9dea795a5e631c26f1::fud::FUD ',
    );

    const cointTypeData = await conversation.waitFor([':text', '::url']);
    const possibleCoin = (cointTypeData.msg.text || '').trim();

    const isCoinTypeIsValid = isValidTokenAddress(possibleCoin);
    const isValidSuiScanLink = isValidCoinLink(possibleCoin);

    if (!isCoinTypeIsValid && !isValidSuiScanLink) {
      const replyText = isCoinTypeIsValid
        ? `Token address is not correct. Make sure address ${possibleCoin} is correct. \n You can enter a token address or a Suiscan link.`
        : `Suiscan link is not correct. Make sure your link is correct is correct.\nExample:\nhttps://suiscan.xyz/mainnet/coin/0x76cb819b01abed502bee8a702b4c2d547532c12f25001c9dea795a5e631c26f1::fud::FUD`;

      await ctx.reply(replyText);

      return;
    }

    const coinType = isCoinTypeIsValid
      ? possibleCoin
      : extractCoinTypeFromLink(possibleCoin);
    // ts check
    if (coinType === null) {
      await ctx.reply(
        // eslint-disable-next-line max-len
        `Coin type is not correct. Make sure address ${possibleCoin} is correct. \n You can enter a token address or a Suiscan link.
        `,
      );
      return;
    }

    let coinToBuy: CommonCoinData | null = null;
    try {
      const coinManager = await getCoinManager()
      coinToBuy = coinManager.getCoinByType(coinType);
    } catch (e) {
      console.error(`Token ${coinType} not found in coinManager`);

      await ctx.reply(
        // eslint-disable-next-line max-len
        `Token address not found. Make sure address ${possibleCoin} is correct. \n You can enter a token address or a Suiscan link.
        `,
      );

      return;
    }

    const isTokensAreEqual =
      swapTokenTypesAreEqual(coinToBuy.type, LONG_SUI_COIN_TYPE) ||
      swapTokenTypesAreEqual(coinToBuy.type, SHORT_SUI_COIN_TYPE);

    if (isTokensAreEqual) {
      await ctx.reply(
        `You can't buy sui for sui. Please specify another token to buy`,
      );

      return;
    }

    const walletManager = await getWalletManager()
    const availableBalance = await walletManager!.getAvailableSuiBalance(
      ctx.session.publicKey,
    );
    await ctx.reply(
      `Reply with the amount you wish to buy (0 - ${availableBalance} SUI, Example: 0.1):`,
    );

    const amountData = await conversation.waitFor(':text');
    const possibleAmount = amountData.msg.text;

    // TODO: TEST
    const isAmountIsValid = isValidTokenAmount({
      amount: possibleAmount,
      maxAvailableAmount: availableBalance,
      decimals: SUI_DECIMALS,
    });

    if (!isAmountIsValid.isValid) {
      await ctx.reply(
        // eslint-disable-next-line max-len
        `Invalid amount. Reason: ${isAmountIsValid.reason} Press cancel button and try again.`,
      );

      return;
    }

    await ctx.reply('Initiating swap');
    let tx;

    try {
      const routerManager = await getRouteManager()
      tx = await routerManager!.getBestRouteTransaction({
        tokenFrom: LONG_SUI_COIN_TYPE,
        tokenTo: coinToBuy.type,
        amount: possibleAmount,
        signerAddress: ctx.session.publicKey,
        slippagePercentage: 10,
      });
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

      await ctx.reply('Transaction creation failed');

      return;
    }

    await ctx.reply('Route for swap found, sending transaction...');

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
          `Swap failed \n https://suiscan.xyz/mainnet/tx/${res.digest}`,
        );

        return;
      }

      await ctx.reply(
        `Swap successful \n https://suiscan.xyz/mainnet/tx/${res.digest}`,
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

      await ctx.reply('Transaction sending failed');

      return;
    }
  }


export async function sell(
    conversation: MyConversation,
    ctx: BotContext,
  ): Promise<void> {
    await ctx.reply(
      'Which token do you want to sell? Please send a coin type or a link to suiscan.',
    );

    await ctx.reply(
      'Example of coin type format:\n0x76cb819b01abed502bee8a702b4c2d547532c12f25001c9dea795a5e631c26f1::fud::FUD\nExample of suiscan link:\nhttps://suiscan.xyz/mainnet/coin/0x76cb819b01abed502bee8a702b4c2d547532c12f25001c9dea795a5e631c26f1::fud::FUD ',
    );
    const cointTypeData = await conversation.waitFor(':text');
    const possibleCoin = (cointTypeData.msg.text || '').trim();

    const isCoinTypeIsValid = isValidTokenAddress(possibleCoin);
    const isValidSuiScanLink = isValidCoinLink(possibleCoin);

    if (!isCoinTypeIsValid && !isValidSuiScanLink) {
      const replyText = isCoinTypeIsValid
        ? `Token address is not correct. Make sure address ${possibleCoin} is correct. \n You can enter a token address or a Suiscan link.`
        : `Suiscan link is not correct. Make sure your link is correct is correct.\nExample:\nhttps://suiscan.xyz/mainnet/coin/0x76cb819b01abed502bee8a702b4c2d547532c12f25001c9dea795a5e631c26f1::fud::FUD`;

      await ctx.reply(replyText);

      return;
    }

    const coinType = isCoinTypeIsValid
      ? possibleCoin
      : extractCoinTypeFromLink(possibleCoin);
    // ts check
    if (coinType === null) {
      await ctx.reply(
        // eslint-disable-next-line max-len
        `Coin type is not correct. Make sure address ${possibleCoin} is correct. \n You can enter a token address or a Suiscan link.
        `,
      );
      return;
    }

    let coinToSell: CommonCoinData | null = null;
    try {
      const coinManager = await getCoinManager()
      coinToSell = coinManager.getCoinByType(coinType);
    } catch (e) {
      console.error(`Token ${coinType} not found in coinManager`);

      await ctx.reply(
        // eslint-disable-next-line max-len
        `Token address not found. Make sure address ${coinType} is correct. \n You can enter a token address or a Suiscan link.
        `,
      );

      return;
    }

    const isTokensAreEqual =
      swapTokenTypesAreEqual(coinToSell.type, LONG_SUI_COIN_TYPE) ||
      swapTokenTypesAreEqual(coinToSell.type, SHORT_SUI_COIN_TYPE);

    if (isTokensAreEqual) {
      await ctx.reply(
        `You can't sell sui for sui. Please specify another token to sell`,
      );

      return;
    }

    const walletManager = await getWalletManager()
    const allCoinsAssets = await walletManager.getAllCoinAssets(
      ctx.session.publicKey,
    );
    const coin = allCoinsAssets.find((el) => el.type === coinToSell?.type);

    if (!coin) {
      await ctx.reply(
        // eslint-disable-next-line max-len
        `Token not found in your wallet assets.
        `,
      );

      return;
    }

    await ctx.reply(
      `Reply with the amount you wish to buy (0 - ${coin.balance} ${coin.symbol || coin.type}, Example: 0.1):`,
    );

    const amountData = await conversation.waitFor(':text');
    const possibleAmount = amountData.msg.text;

    // TODO: Re-check this
    // const isAmountIsValid = isValidTokenAmount(+possibleAmount, coin.balance);
    const isAmountIsValid = isValidTokenAmount({
      amount: possibleAmount,
      maxAvailableAmount: coin.balance,
      decimals: coin.decimals,
    });

    if (!isAmountIsValid.isValid) {
      await ctx.reply(
        // eslint-disable-next-line max-len
        `Invalid amount. Reason: ${isAmountIsValid.reason} Press cancel button and try again.`,
      );

      return;
    }

    const availableBalance = await walletManager.getAvailableSuiBalance(
      ctx.session.publicKey,
    );
    const isAmountSuiAmountIsValid = +availableBalance > 0;

    if (!isAmountSuiAmountIsValid) {
      await ctx.reply(
        // eslint-disable-next-line max-len
        "You don't have enough SUI for transaction gas. Please top up your SUI balance for continue.",
      );

      return;
    }

    await ctx.reply('Initiating swap');

    let tx;

    try {
      const routerManager = await getRouteManager()
      tx = await routerManager.getBestRouteTransaction({
        tokenFrom: coin.type,
        tokenTo: LONG_SUI_COIN_TYPE,
        amount: possibleAmount,
        signerAddress: ctx.session.publicKey,
        slippagePercentage: ctx.session?.settings?.slippagePercentage || 10,
      });
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

      await ctx.reply('Transaction creation failed');

      return;
    }

    await ctx.reply('Route for swap found, sending transaction...');

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
          `Swap failed \n https://suiscan.xyz/mainnet/tx/${res.digest}`,
        );

        return;
      }

      await ctx.reply(
        `Swap successful \n https://suiscan.xyz/mainnet/tx/${res.digest}`,
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

      await ctx.reply('Transaction sending failed');

      return;
    }
  }

export async function exportPrivateKey(
    conversation: MyConversation,
    ctx: BotContext,
  ): Promise<void> {
    await ctx.reply(
      `Are you sure want to export private key? Please type CONFIRM if yes.`,
    );

    const messageData = await conversation.waitFor(':text');
    const isExportConfirmed = messageData.msg.text === 'CONFIRM';

    if (!isExportConfirmed) {
      await ctx.reply(
        `You've not typed CONFIRM. Ignoring your request of exporting private key`,
      );

      return;
    }

    await ctx.reply(
      `Your private key is: <code>${ctx.session.privateKey}</code>\nYou can now i.e. import the key into a wallet like Suiet.\nDelete this message once you are done.`,
      { parse_mode: 'HTML' },
    );
  }

export async function withdraw(
    conversation: MyConversation,
    ctx: BotContext,
  ): Promise<void> {
    await ctx.reply(
      `Please type the address you'd like to withdraw ALL you SUI coin`,
    );

    const messageData = await conversation.waitFor(':text');
    const destinationSuiAddress = messageData.msg.text;

    const isAddressIsValid = isValidSuiAddress(destinationSuiAddress);

    if (!isAddressIsValid) {
      await ctx.reply(
        `Destination wallet address is not correct.\nMake sure address ${destinationSuiAddress} is correct`,
      );

      return;
    }

    const walletManager = await getWalletManager()
    const { availableAmount, totalGasFee } =
      await walletManager.getAvailableWithdrawSuiAmount(
        ctx.session.publicKey,
      );
    await ctx.reply(
      `Reply with the amount you wish to withdraw (0 - ${availableAmount} SUI, Example: 0.1):`,
    );

    const amountData = await conversation.waitFor(':text');
    const possibleAmount = amountData.msg.text;

    const isAmountIsValid = isValidTokenAmount({
      amount: possibleAmount,
      maxAvailableAmount: availableAmount,
      decimals: SUI_DECIMALS,
    });

    if (!isAmountIsValid.isValid) {
      await ctx.reply(
        // eslint-disable-next-line max-len
        `Invalid amount. Reason: ${isAmountIsValid.reason} Press cancel button and try again.`,
      );

      return;
    }

    await ctx.reply('Initiating withdrawal');
    let tx;

    try {
      const txBlock = await WalletManagerSingleton.getWithdrawSuiTransaction({
        amount: possibleAmount,
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

      await ctx.reply('Transaction creation failed');

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
          `Withdraw failed \n https://suiscan.xyz/mainnet/tx/${res.digest}`,
        );

        return;
      }

      await ctx.reply(
        `Withdraw successful \n https://suiscan.xyz/mainnet/tx/${res.digest}`,
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

      await ctx.reply('Transaction sending failed');

      return;
    }
  }

export async function availableBalance(ctx: any): Promise<string> {
  const walletManager = await getWalletManager()
    const availableBalance = await walletManager.getAvailableSuiBalance(
      ctx.session.publicKey,
    );
    return availableBalance as string;
  }

export async function balance(ctx: BotContext): Promise<string> {
  const walletManager = await getWalletManager()
    const balance = await walletManager.getSuiBalance(
      ctx.session.publicKey,
    );
    return balance;
  }
  

export async function assets(ctx: BotContext): Promise<void> {
    try {
      const walletManager = await getWalletManager()
      const allCoinsAssets = await walletManager.getAllCoinAssets(
        ctx.session.publicKey,
      );

      ctx.session.assets = allCoinsAssets;

      if (allCoinsAssets?.length === 0) {
        ctx.reply(`Your have no tokens yet`);
        return;
      }
      const assetsString = allCoinsAssets?.reduce((acc, el) => {
        acc = acc.concat(
          `Token: ${el.symbol || el.type}\nType: ${el.type}\nAmount: ${el.balance}\n\n`,
        );

        return acc;
      }, '');
      ctx.reply(`Your tokens: \n\n${assetsString}`, {
        // parse_mode: 'MarkdownV2',
        reply_markup: positions_menu,
        // disable_web_page_preview: true,
      });
    } catch (e) {
      ctx.reply('Failed to fetch assets, please try again');
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
    const welcome_text = `Welcome to RINbot on Sui Network\n\nYour wallet address: ${ctx.session.publicKey} \nYour SUI balance: ${userBalance}\nYour available SUI balance: ${avl_balance}`;
    await ctx.reply(welcome_text, { reply_markup: menu });
}
