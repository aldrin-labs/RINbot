
import {
    AftermathSingleton,
    CetusSingleton,
    CoinManagerSingleton,
    CommonCoinData,
    FlowxSingleton,
    LONG_SUI_COIN_TYPE,
    Providers,
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
  } from "@avernikoz/rinbot-sui-sdk";

import { MyConversation, BotContext } from "../types";

export const swapTokenTypesAreEqual = (tokenTo: string, tokenFrom: string) => {
    return tokenTo === tokenFrom;
};
interface ISuiAPI {
    buy(conversation: MyConversation, ctx: BotContext): void,
    sell(conversation: MyConversation, ctx: BotContext): void,
    exportPrivateKey(conversation: MyConversation, ctx: BotContext): void,
    withdraw(conversation: MyConversation, ctx: BotContext): void,
    availableBalance(ctx: any): void,
    balance(ctx: any): void,
    assets(ctx: any): void,
    generateWallet(): {privateKey: string, publicKey: string}
}
export var SuiApi: ISuiAPI;

const init = async () => {
    if (SuiApi != null) return;
    SuiApi = {} as ISuiAPI;
    const SUI_PROVIDER_URL = "https://sui-rpc.publicnode.com";
    const provider = getSuiProvider({ url: SUI_PROVIDER_URL });
    // SDK instances init
    const cacheOptions = { updateIntervalInMs: 1000 * 60 * 30 };
    const turbos: TurbosSingleton = await TurbosSingleton.getInstance({ suiProviderUrl: SUI_PROVIDER_URL, cacheOptions });
    const cetus: CetusSingleton = await CetusSingleton.getInstance({
      suiProviderUrl: SUI_PROVIDER_URL,
      sdkOptions: clmmMainnet,
      cacheOptions,
    });
    const aftermath: AftermathSingleton = await AftermathSingleton.getInstance({ cacheOptions });
    const flowx: FlowxSingleton = await FlowxSingleton.getInstance({ cacheOptions });
    
    const coinManager: CoinManagerSingleton = CoinManagerSingleton.getInstance([turbos, cetus, aftermath, flowx]);
    const walletManager: WalletManagerSingleton = WalletManagerSingleton.getInstance(provider, coinManager);
    const providers: Providers = [turbos, cetus, aftermath, flowx];
    const routerManager = RouteManager.getInstance(providers, coinManager);

    const buy = async function (conversation: MyConversation, ctx: BotContext) {
        await ctx.reply("Which token do you want to buy? Please send a coin type or a link to suiscan.");
        const cointTypeData = await conversation.waitFor(":text");
        const possibleCoinType = cointTypeData.msg.text;
    
        const isCoinTypeIsValid = isValidTokenAddress(possibleCoinType);
    
        if (!isCoinTypeIsValid) {
          await ctx.reply(
            // eslint-disable-next-line max-len
            `Token address is not correct. Make sure address ${possibleCoinType} is correct. \n You can enter a token address or a Suiscan/Birdeye link.
            `,
          );
    
          return;
        }
    
        let coinToBuy: CommonCoinData | null = null;
        try {
          coinToBuy = coinManager.getCoinByType(possibleCoinType);
        } catch (e) {
          console.error(`Token ${possibleCoinType} not found in coinManager`);
    
          await ctx.reply(
            // eslint-disable-next-line max-len
            `Token address not found. Make sure address ${possibleCoinType} is correct. \n You can enter a token address or a Suiscan/Birdeye link.
            `,
          );
    
          return;
        }
    
        const isTokensAreEqual =
          swapTokenTypesAreEqual(coinToBuy.type, LONG_SUI_COIN_TYPE) ||
          swapTokenTypesAreEqual(coinToBuy.type, SHORT_SUI_COIN_TYPE);
    
        if (isTokensAreEqual) {
          await ctx.reply(`You can't buy sui for sui. Please specify another token to buy`);
    
          return;
        }
    
        const availableBalance = await walletManager.getAvailableSuiBalance(ctx.session.publicKey);
        await ctx.reply(`Reply with the amount you wish to buy (0 - ${availableBalance} SUI, Example: 0.1):`);
    
        const amountData = await conversation.waitFor(":text");
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
            `Invalid amount. Reason: ${isAmountIsValid.reason} Press button and try again.`,
          );
    
          return;
        }
    
        await ctx.reply("Initiating swap");
        let tx;
    
        try {
          tx = await routerManager.getBestRouteTransaction({
            tokenFrom: LONG_SUI_COIN_TYPE,
            tokenTo: coinToBuy.type,
            amount: possibleAmount,
            signerAddress: ctx.session.publicKey,
            slippagePercentage: 10,
          });
        } catch (error) {
          console.error(error);
    
          if (error instanceof Error) {
            console.error(`[routerManager.getBestRouteTransaction] failed to create transaction: ${error.message}`);
          } else {
            console.error(`[routerManager.getBestRouteTransaction] failed to create transaction: ${error}`);
          }
    
          await ctx.reply("Transaction creation failed");
    
          return;
        }
    
        await ctx.reply("Route for swap found, sending transaction...");
    
        try {
          const res = await provider.signAndExecuteTransactionBlock({
            transactionBlock: tx,
            signer: WalletManagerSingleton.getKeyPairFromPrivateKey(ctx.session.privateKey),
          });
    
          await ctx.reply(`Swap successful \n https://suiscan.xyz/mainnet/tx/${res.digest}`);
        } catch (error) {
          if (error instanceof Error) {
            console.error(`[provider.signAndExecuteTransactionBlock] failed to send transaction: ${error.message}`);
          } else {
            console.error(`[provider.signAndExecuteTransactionBlock] failed to send transaction: ${error}`);
          }
    
          await ctx.reply("Transaction sending failed");
    
          return;
        }
      }

    const sell =  async function (conversation: MyConversation, ctx: BotContext) {
        await ctx.reply("Which token do you want to sell? Please send a coin type or a link to suiscan.");
        const cointTypeData = await conversation.waitFor(":text");
        const possibleCoinType = cointTypeData.msg.text;
    
        const isCoinTypeIsValid = isValidTokenAddress(possibleCoinType);
    
        if (!isCoinTypeIsValid) {
          await ctx.reply(
            // eslint-disable-next-line max-len
            `Token address is not correct. Make sure address ${possibleCoinType} is correct. \n You can enter a token address or a Suiscan/Birdeye link.
            `,
          );
    
          return;
        }
    
        let coinToSell: CommonCoinData | null = null;
        try {
          coinToSell = coinManager.getCoinByType(possibleCoinType);
        } catch (e) {
          console.error(`Token ${possibleCoinType} not found in coinManager`);
    
          await ctx.reply(
            // eslint-disable-next-line max-len
            `Token address not found. Make sure address ${possibleCoinType} is correct. \n You can enter a token address or a Suiscan/Birdeye link.
            `,
          );
    
          return;
        }
    
        const isTokensAreEqual =
          swapTokenTypesAreEqual(coinToSell.type, LONG_SUI_COIN_TYPE) ||
          swapTokenTypesAreEqual(coinToSell.type, SHORT_SUI_COIN_TYPE);
    
        if (isTokensAreEqual) {
          await ctx.reply(`You can't sell sui for sui. Please specify another token to sell`);
    
          return;
        }
    
        const allCoinsAssets = await walletManager.getAllCoinAssets(ctx.session.publicKey);
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
    
        const amountData = await conversation.waitFor(":text");
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
            `Invalid amount. Reason: ${isAmountIsValid.reason} Press button and try again.`,
          );
    
          return;
        }
    
        const availableBalance = await walletManager.getAvailableSuiBalance(ctx.session.publicKey);
        const isAmountSuiAmountIsValid = +availableBalance > 0;
    
        if (!isAmountSuiAmountIsValid) {
          await ctx.reply(
            // eslint-disable-next-line max-len
            "You don't have enough SUI for transaction gas. Please top up your SUI balance for continue.",
          );
    
          return;
        }
    
        await ctx.reply("Initiating swap");
    
        let tx;
    
        try {
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
            console.error(`[routerManager.getBestRouteTransaction] failed to create transaction: ${error.message}`);
          } else {
            console.error(`[routerManager.getBestRouteTransaction] failed to create transaction: ${error}`);
          }
    
          await ctx.reply("Transaction creation failed");
    
          return;
        }
    
        await ctx.reply("Route for swap found, sending transaction...");
    
        try {
          const res = await provider.signAndExecuteTransactionBlock({
            transactionBlock: tx,
            signer: WalletManagerSingleton.getKeyPairFromPrivateKey(ctx.session.privateKey),
          });
    
          await ctx.reply(`Swap successful \n https://suiscan.xyz/mainnet/tx/${res.digest}`);
        } catch (error) {
          if (error instanceof Error) {
            console.error(`[provider.signAndExecuteTransactionBlock] failed to send transaction: ${error.message}`);
          } else {
            console.error(`[provider.signAndExecuteTransactionBlock] failed to send transaction: ${error}`);
          }
    
          await ctx.reply("Transaction sending failed");
    
          return;
        }
      }

    const exportPrivateKey = async function (conversation: MyConversation, ctx: BotContext) {
        await ctx.reply(`Are you sure want to export private key? Please type CONFIRM if yes.`);
    
        const messageData = await conversation.waitFor(":text");
        const isExportConfirmed = messageData.msg.text === "CONFIRM";
    
        if (!isExportConfirmed) {
          await ctx.reply(`You've not typed CONFIRM. Ignoring your request of exporting private key`);
    
          return;
        }
    
        await ctx.reply(
          `Your private key is: <code>${ctx.session.privateKey}</code>\nYou can now i.e. import the key into a wallet like Suiet.\nDelete this message once you are done.`,
          { parse_mode: "HTML" },
        );
    }

    const withdraw = async function(conversation: MyConversation, ctx: BotContext) {
        await ctx.reply(`Please type the address you'd like to withdraw ALL you SUI coin`);
    
        const messageData = await conversation.waitFor(":text");
        const destinationSuiAddress = messageData.msg.text;
    
        const isAddressIsValid = isValidSuiAddress(destinationSuiAddress);
    
        if (!isAddressIsValid) {
          await ctx.reply(
            `Destination wallet address is not correct.\nMake sure address ${destinationSuiAddress} is correct`,
          );
    
          return;
        }
    
        const availableBalance = await walletManager.getSuiBalance(ctx.session.publicKey);
        await ctx.reply(`Reply with the amount you wish to buy (0 - ${availableBalance} SUI, Example: 0.1):`);
    
        const amountData = await conversation.waitFor(":text");
        const possibleAmount = amountData.msg.text;
    
        const isAmountIsValid = isValidTokenAmount({
          amount: possibleAmount,
          maxAvailableAmount: availableBalance,
          decimals: SUI_DECIMALS,
        });
    
        if (!isAmountIsValid.isValid) {
          await ctx.reply(
            // eslint-disable-next-line max-len
            `Invalid amount. Reason: ${isAmountIsValid.reason} Press button and try again.`,
          );
    
          return;
        }
    
        await ctx.reply("Initiating withdrawal");
        let tx;
    
        try {
          tx = await WalletManagerSingleton.getWithdrawSuiTransaction({
            amount: possibleAmount,
            address: destinationSuiAddress,
          });
        } catch (error) {
          console.error(error);
    
          if (error instanceof Error) {
            console.error(`[routerManager.getBestRouteTransaction] failed to create transaction: ${error.message}`);
          } else {
            console.error(`[routerManager.getBestRouteTransaction] failed to create transaction: ${error}`);
          }
    
          await ctx.reply("Transaction creation failed");
    
          return;
        }
    
        await ctx.reply("Sending withdraw transaction...");
    
        try {
          const res = await provider.signAndExecuteTransactionBlock({
            transactionBlock: tx,
            signer: WalletManagerSingleton.getKeyPairFromPrivateKey(ctx.session.privateKey),
          });
    
          await ctx.reply(`Withdraw successful \n https://suiscan.xyz/mainnet/tx/${res.digest}`);
        } catch (error) {
          if (error instanceof Error) {
            console.error(`[provider.signAndExecuteTransactionBlock] failed to send transaction: ${error.message}`);
          } else {
            console.error(`[provider.signAndExecuteTransactionBlock] failed to send transaction: ${error}`);
          }
    
          await ctx.reply("Transaction sending failed");
    
          return;
        }
      }

    const availableBalance = async (ctx: any) => {
        const availableBalance = await walletManager.getAvailableSuiBalance(ctx.session.publicKey);
        ctx.reply(`Your SUI balance: ${availableBalance}`);
    }

    const balance = async (ctx: any) => {
        const balance = await walletManager.getSuiBalance(ctx.session.publicKey);
        ctx.reply(`Your SUI balance: ${balance}`);
    };

    const assets = async (ctx: any) => {
        try {
          const allCoinsAssets = await walletManager.getAllCoinAssets(ctx.session.publicKey);
    
          if (allCoinsAssets.length === 0) {
            ctx.reply(`Your have no tokens yet`);
            return;
          }
          const assetsString = allCoinsAssets.reduce((acc, el) => {
            acc = acc.concat(`Token: ${el.symbol || el.type}\nType: ${el.type}\nAmount: ${el.balance}\n\n`);
    
            return acc;
          }, "");
          ctx.reply(`Your tokens: \n\n${assetsString}`);
        } catch (e) {
          ctx.reply("Failed to fetch assets, please try again");
        }
    };

    const generateWallet = (): any => {
        return WalletManagerSingleton.generateWallet();
    }

    SuiApi = {
        buy,
        sell,
        exportPrivateKey,
        withdraw,
        availableBalance,
        balance,
        assets,
        generateWallet
    }
}
await init();