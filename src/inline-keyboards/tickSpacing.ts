import { InlineKeyboard } from 'grammy';

const tickSpacingKeyboard = new InlineKeyboard()
  .text('2')
  .text('10')
  .row()
  .text('60')
  .text('200');

export default tickSpacingKeyboard;
