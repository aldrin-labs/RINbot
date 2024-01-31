import {
  AftermathSingleton,
  CetusSingleton,
  CoinManagerSingleton,
  CommonCoinData,
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
import positions_menu from '../menu/positions';
import menu from '../menu/main';

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
  home(ctx: any): void;
  buy(conversation: MyConversation, ctx: BotContext): void;
  sell(conversation: MyConversation, ctx: BotContext): void;
  exportPrivateKey(conversation: MyConversation, ctx: BotContext): void;
  withdraw(conversation: MyConversation, ctx: BotContext): void;
  availableBalance(ctx: any): Promise<string>;
  balance(ctx: any): Promise<string>;
  assets(ctx: any): void;
  generateWallet(): { privateKey: string; publicKey: string };
  getExplorerLink(ctx: BotContext): string;
}

class SuiApiSingleton {
  private static instance: SuiApiSingleton | null = null;
  private initialized: boolean = false;
  private suiApi: ISuiAPI | null = null;
  private coinManager: CoinManagerSingleton | null = null;
  private walletManager: WalletManagerSingleton | null = null;
  private routerManager: RouteManager | null = null;
  private provider: any | null = null;

  private constructor() {}

  public static async getInstance(): Promise<SuiApiSingleton> {
    if (!SuiApiSingleton.instance) {
      SuiApiSingleton.instance = new SuiApiSingleton();
      await SuiApiSingleton.instance.initialize();
    }
    return SuiApiSingleton.instance;
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return;
    const SUI_PROVIDER_URL =
      'https://sui-mainnet.blockvision.org/v1/2bYB32LD0S06isRTaxATLv1mTt6';
    const provider = getSuiProvider({ url: SUI_PROVIDER_URL });
    this.provider = provider;
    // SDK instances init
    const cacheOptions = { updateIntervalInMs: 1000 * 60 * 30 };
    const turbos: TurbosSingleton = await TurbosSingleton.getInstance({
      suiProviderUrl: SUI_PROVIDER_URL,
      cacheOptions,
    });
    const cetus: CetusSingleton = await CetusSingleton.getInstance({
      suiProviderUrl: SUI_PROVIDER_URL,
      sdkOptions: clmmMainnet,
      cacheOptions: cacheOptions,
    });
    const aftermath: AftermathSingleton = await AftermathSingleton.getInstance({
      cacheOptions,
    });
    // const flowx: FlowxSingleton = await FlowxSingleton.getInstance({
    //   cacheOptions,
    // });

    const providers: Providers = [turbos, cetus, aftermath /*, flowx*/];
    const coinManager: CoinManagerSingleton =
      CoinManagerSingleton.getInstance(providers);
    const walletManager: WalletManagerSingleton =
      WalletManagerSingleton.getInstance(provider, coinManager);
    const routerManager = RouteManager.getInstance(providers, coinManager);

    this.coinManager = coinManager;
    this.walletManager = walletManager;
    this.routerManager = routerManager;

    this.suiApi = {
      home: this.home.bind(this),
      buy: this.buy.bind(this),
      sell: this.sell.bind(this),
      exportPrivateKey: this.exportPrivateKey.bind(this),
      withdraw: this.withdraw.bind(this),
      availableBalance: this.availableBalance.bind(this),
      balance: this.balance.bind(this),
      assets: this.assets.bind(this),
      generateWallet: this.generateWallet.bind(this),
      getExplorerLink: this.getExplorerLink.bind(this),
    };
    this.initialized = true;
  }

  public getApi(): ISuiAPI {
    if (!this.initialized || !this.suiApi) {
      throw new Error('SuiApiSingleton not initialized properly.');
    }
    return this.suiApi;
  }

  public async home(ctx: any) {
    // Send the menu.
    const balance = await this.balance(ctx);
    const avl_balance = await this.availableBalance(ctx);
    const welcome_text = `Welcome to RINbot on Sui Network\n\nYour wallet address: ${ctx.session.publicKey} \n
Your SUI balance: ${balance}\n
Your available SUI balance: ${avl_balance}`;
    await ctx.reply(welcome_text, { reply_markup: menu });
  }

  private async buy(conversation: MyConversation, ctx: BotContext) {
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

  private async sell(
    conversation: MyConversation,
    ctx: BotContext,
  ): Promise<void> {
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

  private async exportPrivateKey(
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

  private async withdraw(
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

    const { availableAmount, totalGasFee } =
      await this.walletManager!.getAvailableWithdrawSuiAmount(
        ctx.session.publicKey,
      );
    await ctx.reply(
      `Reply with the amount you wish to buy (0 - ${availableAmount} SUI, Example: 0.1):`,
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
        `Invalid amount. Reason: ${isAmountIsValid.reason} Press button and try again.`,
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
      const res = await this.provider.signAndExecuteTransactionBlock({
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

  private async availableBalance(ctx: any): Promise<string> {
    const availableBalance = await this.walletManager?.getAvailableSuiBalance(
      ctx.session.publicKey,
    );
    return availableBalance as string;
  }

  private async balance(ctx: any): Promise<string> {
    const balance = await this.walletManager?.getSuiBalance(
      ctx.session.publicKey,
    );
    return balance as string;
  }

  private async assets(ctx: any): Promise<void> {
    try {
      const allCoinsAssets = await this.walletManager!.getAllCoinAssets(
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
        disable_web_page_preview: true,
      });
    } catch (e) {
      ctx.reply('Failed to fetch assets, please try again');
    }
  }

  private generateWallet(): any {
    return WalletManagerSingleton.generateWallet();
  }

  private getExplorerLink(ctx: BotContext): string {
    return `https://suiscan.xyz/mainnet/account/${ctx.session.publicKey}`;
  }
}

export default SuiApiSingleton;
