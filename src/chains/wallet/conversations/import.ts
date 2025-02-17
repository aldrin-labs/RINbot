import { WalletManagerSingleton, isValidPrivateKey } from '@avernikoz/rinbot-sui-sdk';
import { HISTORY_TABLE } from '../../../config/bot.config';
import closeConversation from '../../../inline-keyboards/closeConversation';
import goHome from '../../../inline-keyboards/goHome';
import { retryAndGoHomeButtonsData } from '../../../inline-keyboards/retryConversationButtonsFactory';
import { documentClient } from '../../../services/aws';
import { BotContext, MyConversation } from '../../../types';
import { CallbackQueryData } from '../../../types/callback-queries-data';
import { CommonConversationId } from '../../conversations.config';
import { reactOnUnexpectedBehaviour } from '../../utils';
import { warnWithCheckAndPrivateKeyPrinting } from '../utils';

export async function importNewWallet(conversation: MyConversation, ctx: BotContext): Promise<void> {
  const retryButton = retryAndGoHomeButtonsData[CommonConversationId.ImportNewWallet];
  const warnMessage =
    '✅ Before proceeding with importing a new wallet, please be aware that you will need to <i><b>export the private ' +
    'key of your current wallet</b></i>. Pressing the <b>Confirm</b> button will initiate the process of exporting ' +
    'the private key of your current wallet.\n\n⚠️ Importing a new wallet <i><b>without exporting the ' +
    'private key</b></i> may result in <i><b>loss of access to your current funds</b></i>.';

  const warnWithCheckAndPrintSucceeded = await warnWithCheckAndPrivateKeyPrinting({
    conversation,
    ctx,
    operation: 'new wallet import',
    warnMessage,
    retryButton,
  });

  if (!warnWithCheckAndPrintSucceeded) {
    return;
  }

  // Asking user for new private key or seed phrase
  await ctx.reply(
    'Enter a <b>private key</b> of the wallet you want to import.\n\n' +
      '<b>Hint</b>: We do support private keys in both <code>hex</code> and <code>Bech32</code> ' +
      '(starts with <code>suiprivkey</code>) formats.',
    { reply_markup: closeConversation, parse_mode: 'HTML' },
  );

  const newWalletCredsContext = await conversation.wait();
  const newWalletCredsCallbackQueryData = newWalletCredsContext.callbackQuery?.data;
  const newWalletCreds = newWalletCredsContext.msg?.text;

  if (newWalletCredsCallbackQueryData === CallbackQueryData.Cancel) {
    await conversation.skip();
  } else if (newWalletCreds !== undefined) {
    const credsAreValid = isValidPrivateKey(newWalletCreds);

    if (!credsAreValid) {
      await ctx.reply('Invalid <b>private key</b>. Please, enter a valid one.', {
        reply_markup: closeConversation,
        parse_mode: 'HTML',
      });

      await conversation.skip({ drop: true });
    }

    const newWalletCredsAreTheSameAsOld = newWalletCreds === ctx.session.privateKey;

    if (newWalletCredsAreTheSameAsOld) {
      await ctx.reply('You are trying to import your current wallet 😎\n\nPlease, import new one.', {
        reply_markup: closeConversation,
      });

      await conversation.skip({ drop: true });
    }
  } else {
    await reactOnUnexpectedBehaviour(newWalletCredsContext, retryButton, 'new wallet import');
    return;
  }

  if (newWalletCreds === undefined) {
    await ctx.reply('Cannot process new wallet credentials. Please, try again or contact support.', {
      reply_markup: retryButton,
    });

    return;
  }

  // Creating new wallet keypair
  const newKeypair = WalletManagerSingleton.getKeyPairFromPrivateKey(newWalletCreds);

  // Replacing current wallet credentials with new ones
  conversation.session.publicKey = newKeypair.getPublicKey().toSuiAddress();
  conversation.session.privateKey = WalletManagerSingleton.getPrivateKeyFromKeyPair(newKeypair);

  // Storing imported wallet into AWS Table
  documentClient
    .put({
      TableName: HISTORY_TABLE,
      Item: {
        pk: `${ctx.from?.id}#IMPORTED_WALLET`,
        sk: new Date().getTime(),
        privateKey: conversation.session.privateKey,
        publicKey: conversation.session.publicKey,
      },
    })
    .catch((e) => console.error('ERROR storing imported wallet', e));

  await ctx.reply('New wallet is <b>successfully imported</b>!', {
    reply_markup: goHome,
    parse_mode: 'HTML',
  });

  return;
}
