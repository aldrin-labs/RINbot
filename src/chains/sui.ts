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
} from '@avernikoz/rinbot-sui-sdk';

import { MyConversation, BotContext } from '../types';

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
interface ISuiAPI {
  buy(conversation: MyConversation, ctx: BotContext): void;
  sell(conversation: MyConversation, ctx: BotContext): void;
  exportPrivateKey(conversation: MyConversation, ctx: BotContext): void;
  withdraw(conversation: MyConversation, ctx: BotContext): void;
  availableBalance(ctx: any): void;
  balance(ctx: any): void;
  assets(ctx: any): void;
  generateWallet(): { privateKey: string; publicKey: string };
  getExplorerLink(ctx: BotContext): string;
}

export class SuiApi implements ISuiAPI {
  SUI_PROVIDER_URL =
    'https://sui-mainnet.blockvision.org/v1/2bYB32LD0S06isRTaxATLv1mTt6';
  provider = getSuiProvider({ url: this.SUI_PROVIDER_URL });
  // SDK instances init
  cacheOptions = { updateIntervalInMs: 1000 * 60 * 30 };

  constructor(
    private turbos?: TurbosSingleton,
    private cetus?: CetusSingleton,
    private aftermath?: AftermathSingleton,
    private flowx?: FlowxSingleton,
    private coinManager?: CoinManagerSingleton,
    private walletManager?: WalletManagerSingleton,
    private providers?: Providers,
    private routerManager?: RouteManager,
  ) {
    this.initializeSDKInstances();
  }
  async initializeSDKInstances() {
    this.turbos = await TurbosSingleton.getInstance({
      suiProviderUrl: this.SUI_PROVIDER_URL,
      cacheOptions: this.cacheOptions,
    });
    this.cetus = await CetusSingleton.getInstance({
      suiProviderUrl: this.SUI_PROVIDER_URL,
      sdkOptions: clmmMainnet,
      cacheOptions: this.cacheOptions,
    });
    this.aftermath = await AftermathSingleton.getInstance({
      cacheOptions: this.cacheOptions,
    });
    this.flowx = await FlowxSingleton.getInstance({
      cacheOptions: this.cacheOptions,
    });

    this.coinManager = CoinManagerSingleton.getInstance([
      this.turbos,
      this.cetus,
      this.aftermath,
      this.flowx,
    ]);
    this.walletManager = WalletManagerSingleton.getInstance(
      this.provider,
      this.coinManager,
    );
    this.providers = [this.turbos, this.cetus, this.aftermath, this.flowx];
    this.routerManager = RouteManager.getInstance(
      this.providers,
      this.coinManager,
    );
  }

  async buy(conversation: MyConversation, ctx: BotContext) {
    await ctx.reply(
      'Which token do you want to buy? Please send a coin type or a link to suiscan.',
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
      coinToBuy = this.coinManager!.getCoinByType(coinType);
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

    const availableBalance = await this.walletManager!.getAvailableSuiBalance(
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
        `Invalid amount. Reason: ${isAmountIsValid.reason} Press button and try again.`,
      );

      return;
    }

    await ctx.reply('Initiating swap');
    let tx;

    try {
      tx = await this.routerManager!.getBestRouteTransaction({
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
      const res = await this.provider.signAndExecuteTransactionBlock({
        transactionBlock: tx,
        signer: WalletManagerSingleton.getKeyPairFromPrivateKey(
          ctx.session.privateKey,
        ),
      });

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

  async sell(conversation: MyConversation, ctx: BotContext) {
    await ctx.reply(
      'Which token do you want to sell? Please send a coin type or a link to suiscan.',
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
      coinToSell = this.coinManager!.getCoinByType(coinType);
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

    const allCoinsAssets = await this.walletManager!.getAllCoinAssets(
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
        `Invalid amount. Reason: ${isAmountIsValid.reason} Press button and try again.`,
      );

      return;
    }

    const availableBalance = await this.walletManager!.getAvailableSuiBalance(
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
      tx = await this.routerManager!.getBestRouteTransaction({
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
      const res = await this.provider.signAndExecuteTransactionBlock({
        transactionBlock: tx,
        signer: WalletManagerSingleton.getKeyPairFromPrivateKey(
          ctx.session.privateKey,
        ),
      });

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

  async exportPrivateKey(conversation: MyConversation, ctx: BotContext) {
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

  async withdraw(conversation: MyConversation, ctx: BotContext) {
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

    const availableBalance = await this.walletManager!.getSuiBalance(
      ctx.session.publicKey,
    );
    await ctx.reply(
      `Reply with the amount you wish to buy (0 - ${availableBalance} SUI, Example: 0.1):`,
    );

    const amountData = await conversation.waitFor(':text');
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

    await ctx.reply('Initiating withdrawal');
    let tx;

    try {
      tx = await WalletManagerSingleton.getWithdrawSuiTransaction({
        amount: possibleAmount,
        address: destinationSuiAddress,
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

    await ctx.reply('Sending withdraw transaction...');

    try {
      const res = await this.provider.signAndExecuteTransactionBlock({
        transactionBlock: tx,
        signer: WalletManagerSingleton.getKeyPairFromPrivateKey(
          ctx.session.privateKey,
        ),
      });

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

  availableBalance = async (ctx: any) => {
    const availableBalance = await this.walletManager!.getAvailableSuiBalance(
      ctx.session.publicKey,
    );
    ctx.reply(`Your SUI balance: ${availableBalance}`);
  };

  balance = async (ctx: any) => {
    const balance = await this.walletManager!.getSuiBalance(ctx.session.publicKey);
    ctx.reply(`Your SUI balance: ${balance}`);
  };

  assets = async (ctx: any) => {
    try {
      const allCoinsAssets = await this.walletManager!.getAllCoinAssets(
        ctx.session.publicKey,
      );

      if (allCoinsAssets.length === 0) {
        ctx.reply(`Your have no tokens yet`);
        return;
      }
      const assetsString = allCoinsAssets.reduce((acc, el) => {
        acc = acc.concat(
          `Token: ${el.symbol || el.type}\nType: ${el.type}\nAmount: ${el.balance}\n\n`,
        );

        return acc;
      }, '');
      ctx.reply(`Your tokens: \n\n${assetsString}`);
    } catch (e) {
      ctx.reply('Failed to fetch assets, please try again');
    }
  };

  generateWallet = (): any => {
    return WalletManagerSingleton.generateWallet();
  };

  getExplorerLink = (ctx: BotContext): string => {
    return `https://suiscan.xyz/mainnet/account/${ctx.session.publicKey}`;
  };

  // SuiApi = {
  //   buy,
  //   sell,
  //   exportPrivateKey,
  //   withdraw,
  //   availableBalance,
  //   balance,
  //   assets,
  //   generateWallet,
  //   getExplorerLink,
  // };
}
