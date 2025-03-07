import { InlineKeyboard } from 'grammy';
import { BotContext, ChainType } from '../types';

export const chainSelectionKeyboard = new InlineKeyboard()
  .text('SUI', 'select-chain-sui')
  .text('Solana', 'select-chain-solana')
  .text('Ethereum', 'select-chain-ethereum')
  .row()
  .text('Back', 'back-to-settings');

export function getChainSelectionKeyboard(ctx: BotContext): InlineKeyboard {
  const keyboard = new InlineKeyboard();

  const chains: { name: string; value: ChainType }[] = [
    { name: 'SUI', value: 'sui' },
    { name: 'Solana', value: 'solana' },
    { name: 'Ethereum', value: 'ethereum' },
  ];

  chains.forEach((chain) => {
    const isSelected = ctx.session.selectedChain === chain.value;
    const buttonText = isSelected ? `✅ ${chain.name}` : chain.name;
    keyboard.text(buttonText, `select-chain-${chain.value}`);
  });

  keyboard.row().text('Back', 'back-to-settings');

  return keyboard;
}
