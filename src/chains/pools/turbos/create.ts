import { getPoolObjectIdFromTransactionResult } from '@avernikoz/rinbot-sui-sdk';
import showOwnedTurbosPoolsKeyboard from '../../../inline-keyboards/pools/turbos/show-owned-pools';
import { retryAndGoHomeButtonsData } from '../../../inline-keyboards/retryConversationButtonsFactory';
import { BotContext, MyConversation } from '../../../types';
import { ConversationId } from '../../conversations.config';
import { getTransactionFromMethod, signAndExecuteTransactionAndReturnResult } from '../../conversations.utils';
import { TransactionResultStatus, getCoinManager, getTurbos, getWalletManager } from '../../sui.functions';
import { getSuiVisionTransactionLink } from '../../utils';
import { askForAmountToAddInPool, askForCoinInPool, askForSlippageForPool, askForTickSpacing } from '../utils';
import { getTurbosFeeRatesString, getTurbosPoolUrl } from './utils';

export async function createTurbosPool(conversation: MyConversation, ctx: BotContext) {
  // TODO: Find out why creation fails when base coin is not SUI
  await ctx.reply(
    '✏ <b>Recomendation</b>: use <b>SUI</b> as the second (base) coin in pool. ' +
      'Otherwise pool creation might be failed.',
    { parse_mode: 'HTML' },
  );

  const loadingMessage = await ctx.reply('<b>Loading...</b>', { parse_mode: 'HTML' });

  const retryButton = retryAndGoHomeButtonsData[ConversationId.CreateTurbosPool];

  const coinManager = await getCoinManager();
  const allCoinsAssets = await conversation.external(async () => {
    const walletManager = await getWalletManager();
    // TODO: Maybe we should add try/catch here as well
    const coinAssets = await walletManager.getAllCoinAssets(ctx.session.publicKey);

    return coinAssets;
  });

  await ctx.api.deleteMessage(loadingMessage.chat.id, loadingMessage.message_id);

  const firstCoinData = await askForCoinInPool({
    conversation,
    ctx,
    coinManager,
    allCoinsAssets,
    retryButton,
    stringifiedNumber: 'first',
  });

  if (firstCoinData === undefined) {
    await ctx.reply('Specified coin cannot be found.\n\nPlease, try again and specify another one.', {
      reply_markup: retryButton,
    });

    return;
  }

  const secondCoinData = await askForCoinInPool({
    conversation,
    ctx,
    coinManager,
    allCoinsAssets,
    retryButton,
    stringifiedNumber: 'second',
    firstCoinType: firstCoinData.type,
  });

  if (secondCoinData === undefined) {
    await ctx.reply('Specified coin cannot be found.\n\nPlease, try again and specify another one.', {
      reply_markup: retryButton,
    });

    return;
  }

  const feeRatesString = await conversation.external(() => getTurbosFeeRatesString());
  const tickSpacing = await askForTickSpacing({ conversation, ctx, feeRatesString, retryButton });

  const findingPoolMessage = await ctx.reply('Finding pool with the same params...');

  const existingPool = await conversation.external(async () => {
    const turbos = await getTurbos();
    return await turbos.getPoolByParams({
      coinTypeA: firstCoinData.type,
      coinTypeB: secondCoinData.type,
      tickSpacing,
    });
  });

  if (existingPool !== undefined) {
    await ctx.api.editMessageText(
      findingPoolMessage.chat.id,
      findingPoolMessage.message_id,
      'Unfortunately, pool with params you entered <b>already exists and cannot be created</b>. ' +
        '\n\n<b>Info</b>: each pool in Turbos is identified by coins and tick spacing, so you can try to change ' +
        'coins or tick spacing.',
      { reply_markup: retryButton, parse_mode: 'HTML' },
    );

    return;
  }

  await ctx.api.editMessageText(
    findingPoolMessage.chat.id,
    findingPoolMessage.message_id,
    "No pool with the same params, let's continue.",
    { parse_mode: 'HTML' },
  );

  const coinAmountA = await askForAmountToAddInPool({ coinData: firstCoinData, conversation, ctx, retryButton });
  const coinAmountB = await askForAmountToAddInPool({ coinData: secondCoinData, conversation, ctx, retryButton });

  const slippage = await askForSlippageForPool({ conversation, ctx, retryButton });

  // TODO: Add all the params printing and asking for confirmation

  await ctx.reply('<b>Constructing transaction for pool creation...</b>', { parse_mode: 'HTML' });

  const turbos = await getTurbos();
  const transaction = await getTransactionFromMethod({
    conversation,
    ctx,
    method: turbos.getCreatePoolTransaction.bind(turbos) as typeof turbos.getCreatePoolTransaction,
    params: {
      tickSpacing: +tickSpacing,
      amountA: coinAmountA,
      amountB: coinAmountB,
      coinDecimalsA: firstCoinData.decimals,
      coinDecimalsB: secondCoinData.decimals,
      coinTypeA: firstCoinData.type,
      coinTypeB: secondCoinData.type,
      publicKey: conversation.session.publicKey,
      slippage,
    },
  });

  if (transaction === undefined) {
    await ctx.reply('Failed to create transaction for pool creation.', { reply_markup: retryButton });

    return;
  }

  await ctx.reply('<b>Creating pool...</b>', { parse_mode: 'HTML' });

  const { resultStatus, digest, transactionResult } = await signAndExecuteTransactionAndReturnResult({
    conversation,
    ctx,
    transaction,
  });

  if (resultStatus === TransactionResultStatus.Success && digest !== undefined && transactionResult !== undefined) {
    const poolId = getPoolObjectIdFromTransactionResult(transactionResult);

    const retryButtons = retryButton.inline_keyboard[0];
    const showOwnedPoolsWithRetryButtonsKeyboard = showOwnedTurbosPoolsKeyboard
      .clone()
      .row()
      .add(...retryButtons);

    await ctx.reply(
      `✅ <a href="${getTurbosPoolUrl(poolId)}">Pool</a> is ` +
        `<a href="${getSuiVisionTransactionLink(digest)}">successfully created</a>!\n\n` +
        `<span class="tg-spoiler"><b>Hint</b>: created pool will appear on Turbos website within 5 minutes.</span>`,
      {
        reply_markup: showOwnedPoolsWithRetryButtonsKeyboard,
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true },
      },
    );

    return;
  }

  if (resultStatus === TransactionResultStatus.Failure && digest !== undefined) {
    await ctx.reply(`❌ <a href="${getSuiVisionTransactionLink(digest)}">Failed</a> to create Turbos liquidity pool.`, {
      reply_markup: retryButton,
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
    });

    return;
  }

  await ctx.reply('❌ Failed to create Turbos liquidity pool.', {
    reply_markup: retryButton,
    parse_mode: 'HTML',
  });

  return;
}
