/* eslint-disable require-jsdoc */
import "dotenv/config";

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
import { Bot, Context, session, SessionFlavor } from "grammy";
import { freeStorage } from "@grammyjs/storage-free";
import { type Conversation, type ConversationFlavor, conversations, createConversation } from "@grammyjs/conversations";

export const swapTokenTypesAreEqual = (tokenTo: string, tokenFrom: string) => {
  return tokenTo === tokenFrom;
};

export interface SessionData {
  publicKey: string;
  privateKey: string;
  settings: {
    slippagePercentage: number;
  };
}

export type MyContext = Context & SessionFlavor<SessionData> & ConversationFlavor;
export type MyConversation = Conversation<MyContext>;

export const init = async () => {
  if (!process.env.TELEGRAM_BOT_API_KEY?.length) {
    throw new Error("Empty TELEGRAM_BOT_API_KEY");
  }

  const SUI_PROVIDER_URL = "https://sui-rpc.publicnode.com";
  const provider = getSuiProvider({ url: SUI_PROVIDER_URL });
  // SDK instances init
  const cacheOptions = { updateIntervalInMs: 30_000 };
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

  async function buy(conversation: MyConversation, ctx: MyContext) {
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

  async function sell(conversation: MyConversation, ctx: MyContext) {
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

  // IMPORTANT: Stores data per user.
  // See more details: https://grammy.dev/plugins/session#session-keys
  function getSessionKey(ctx: Context): string | undefined {
    // Give every user their personal session storage
    // (will be shared across groups and in their private chat)
    return ctx.from?.id.toString();
  }

  // Create an instance of the `Bot` class and pass your bot token to it.
  const bot = new Bot<MyContext>(process.env.TELEGRAM_BOT_API_KEY); // <-- put your bot token between the ""

  // Install the sessions plugin
  bot.use(
    session({
      // IMPORTANT: LIMITATIONS OF FREE STORAGE: https://github.com/grammyjs/storages/tree/main/packages/free
      storage: freeStorage<SessionData>(bot.token),
      getSessionKey,
      initial: () => {
        // IMPORTANT:
        // Make sure to always create a new object. Do NOT do this:
        // DANGER, BAD, WRONG, STOP
        // const initialData = { pizzaCount: 0 }; // NOPE
        // bot.use(session({ initial: () => initialData })); // EVIL
        // If you would do this, several chats might share the same session object in memory.
        // Hence, changing the session data in one chat may accidentally impact the session data in the other chat.

        const { publicKey, privateKey } = WalletManagerSingleton.generateWallet();

        return {
          publicKey: publicKey,
          privateKey: privateKey,
          // TODO ASAP IMPORTANT MIGRATE SESSION FOR EXISTING USERS
          settings: {
            slippagePercentage: 10,
          },
        };
      },
    }),
  );

  async function exportPrivateKey(conversation: MyConversation, ctx: MyContext) {
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

  async function withdraw(conversation: MyConversation, ctx: MyContext) {
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

  // Install the conversations plugin.
  bot.use(conversations());

  bot.use(createConversation(buy));
  bot.use(createConversation(sell));
  bot.use(createConversation(exportPrivateKey));
  bot.use(createConversation(withdraw));

  // You can now register listeners on your bot object `bot`.
  // grammY will call the listeners when users send messages to your bot.

  await bot.api.setMyCommands([
    { command: "start", description: "Start the bot" },

    { command: "deposit", description: "Show the public key of the wallet" },
    // { command: "withdraw", description: "Withdraw all sui coin from wallet" },

    { command: "export", description: "Export your private key of the wallet" },

    { command: "balance", description: "Show the current SUI balance" },
    { command: "availablebalance", description: "Show the available SUI balance to spend" },
    { command: "assets", description: "Start coin assets of the wallet" },

    { command: "buy", description: "Buy specific coin on SUI" },
    { command: "sell", description: "Sell specific coin to SUI" },
  ]);

  // Handle the /start command.
  bot.command("start", (ctx) => ctx.reply("Welcome to demo SUI trading bot!"));

  bot.command("buy", async (ctx) => {
    await ctx.conversation.enter("buy");
  });

  bot.command("sell", async (ctx) => {
    await ctx.conversation.enter("sell");
  });

  bot.command("deposit", async (ctx) => {
    ctx.reply(`Your public key is: <code>${ctx.session.publicKey}</code>`, { parse_mode: "HTML" });
  });

  // bot.command("withdraw", async (ctx) => {
  //   await ctx.conversation.enter("withdraw");
  // });

  bot.command("export", async (ctx) => {
    await ctx.conversation.enter("exportPrivateKey");
  });

  bot.command("balance", async (ctx) => {
    const balance = await walletManager.getSuiBalance(ctx.session.publicKey);
    ctx.reply(`Your SUI balance: ${balance}`);
  });

  bot.command("availablebalance", async (ctx) => {
    const availableBalance = await walletManager.getAvailableSuiBalance(ctx.session.publicKey);
    ctx.reply(`Your SUI balance: ${availableBalance}`);
  });

  bot.command("assets", async (ctx) => {
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
  });

  // Start the bot.
  bot.start();
};

init();
