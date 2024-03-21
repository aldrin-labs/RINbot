import {
  WalletManagerSingleton,
  isValidPrivateKey,
  isValidSeedPhrase,
} from '@avernikoz/rinbot-sui-sdk';
import { InlineKeyboard } from 'grammy';
import closeConversation from '../../../inline-keyboards/closeConversation';
import confirmWithCloseKeyboard from '../../../inline-keyboards/confirm-with-close';
import goHome from '../../../inline-keyboards/goHome';
import { retryAndGoHomeButtonsData } from '../../../inline-keyboards/retryConversationButtonsFactory';
import { BotContext, MyConversation } from '../../../types';
import { CallbackQueryData } from '../../../types/callback-queries-data';
import { ConversationId } from '../../conversations.config';
import {
  getPrivateKeyString,
  userIsNotEligibleToExportPrivateKey,
} from '../utils';

export async function importNewWallet(
  conversation: MyConversation,
  ctx: BotContext,
): Promise<void> {
  const retryButton = retryAndGoHomeButtonsData[ConversationId.ImportNewWallet];

  // Warning for user
  await ctx.reply(
    '✅ Before proceeding with importing a new wallet, please be aware that you will need to <i><b>export the private ' +
      'key of your current wallet</b></i>. Pressing the <b>Confirm</b> button will initiate the process of exporting ' +
      'the private key of your current wallet.\n\n⚠️ Importing a new wallet <i><b>without exporting the private key</b></i> ' +
      'may result in <i><b>loss of access to your current funds</b></i>.',
    { reply_markup: confirmWithCloseKeyboard, parse_mode: 'HTML' },
  );

  const confirmExportContext = await conversation.wait();
  const confirmExportCallbackQueryData =
    confirmExportContext.callbackQuery?.data;

  if (confirmExportCallbackQueryData === CallbackQueryData.Cancel) {
    await conversation.skip();
  } else if (confirmExportCallbackQueryData !== CallbackQueryData.Confirm) {
    await reactOnUnexpectedBehaviour(confirmExportContext, retryButton);
    return;
  }
  await confirmExportContext.answerCallbackQuery();

  // Checking user is eligible to export private key
  if (await userIsNotEligibleToExportPrivateKey(ctx)) {
    return;
  }

  // Printing user's private key
  const privateKeyString =
    '🔒 Ensure you have securely saved and backed up the private key of your current wallet ' +
    'before the import process.\n\n' +
    getPrivateKeyString(ctx);

  await ctx.reply(privateKeyString, { parse_mode: 'HTML' });

  // Asking user for new private key or seed phrase
  await ctx.reply(
    'Enter a <b>private key</b> of the wallet you want to import.',
    { reply_markup: closeConversation, parse_mode: 'HTML' },
  );

  const newWalletCredsContext = await conversation.wait();
  const newWalletCredsCallbackQueryData =
    newWalletCredsContext.callbackQuery?.data;
  const newWalletCreds = newWalletCredsContext.msg?.text;

  if (newWalletCredsCallbackQueryData === CallbackQueryData.Cancel) {
    await conversation.skip();
  } else if (newWalletCreds !== undefined) {
    const credsAreValid = isValidPrivateKey(newWalletCreds);

    if (!credsAreValid) {
      await ctx.reply(
        'Invalid <b>private key</b>. Please, enter a valid one.',
        { reply_markup: closeConversation, parse_mode: 'HTML' },
      );

      await conversation.skip({ drop: true });
    }

    const newWalletCredsAreTheSameAsOld =
      newWalletCreds === ctx.session.privateKey;

    if (newWalletCredsAreTheSameAsOld) {
      await ctx.reply(
        'You are trying to import your current wallet 😎\n\nPlease, import new one.',
        { reply_markup: closeConversation },
      );

      await conversation.skip({ drop: true });
    }
  } else {
    await reactOnUnexpectedBehaviour(newWalletCredsContext, retryButton);
    return;
  }

  if (newWalletCreds === undefined) {
    await ctx.reply(
      'Cannot process new wallet credentials. Please, try again or contact support.',
      { reply_markup: retryButton },
    );

    return;
  }

  // Creating new wallet keypair
  const newKeypair =
    WalletManagerSingleton.getKeyPairFromPrivateKey(newWalletCreds);

  // Replacing current wallet credentials with new ones
  conversation.session.publicKey = newKeypair.getPublicKey().toSuiAddress();
  conversation.session.privateKey =
    WalletManagerSingleton.getPrivateKeyFromKeyPair(newKeypair);

  await ctx.reply('New wallet is <b>successfully imported</b>!', {
    reply_markup: goHome,
    parse_mode: 'HTML',
  });

  return;
}

async function reactOnUnexpectedBehaviour(
  ctx: BotContext,
  retryButton: InlineKeyboard,
) {
  await ctx.answerCallbackQuery();

  await ctx.reply('You have canceled the new wallet import.', {
    reply_markup: retryButton,
  });
}
