import { InlineKeyboard } from 'grammy';

const dcaTimeUnitKeyboard = new InlineKeyboard()
  .text('Seconds', 'seconds')
  .text('Minutes', 'minutes')
  .row()
  .text('Hours', 'hours')
  .text('Days', 'days')
  .row()
  .text('Weeks', 'weeks')
  .text('Months', 'months');

export default dcaTimeUnitKeyboard;
