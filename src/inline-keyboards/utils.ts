import { InlineKeyboard } from 'grammy';

export function getTwoButtonsInRow(firstKeyboard: InlineKeyboard, secondKeyboard: InlineKeyboard): InlineKeyboard {
  const secondButtons = secondKeyboard.inline_keyboard[0];
  return firstKeyboard.clone().add(...secondButtons);
}

export function getTwoButtonsInColumn(firstKeyboard: InlineKeyboard, secondKeyboard: InlineKeyboard): InlineKeyboard {
  const secondButtons = secondKeyboard.inline_keyboard[0];
  return firstKeyboard
    .clone()
    .row()
    .add(...secondButtons);
}

export function shouldBeRowAfterButton(buttonIndex: number, maxButtonsInRowCount: number) {
  return (buttonIndex + 1) % maxButtonsInRowCount === 0;
}
