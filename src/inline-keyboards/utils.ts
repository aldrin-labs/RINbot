import { InlineKeyboard } from 'grammy';

export function getTwoButtonsInRow(firstKeyboard: InlineKeyboard, secondKeyboard: InlineKeyboard): InlineKeyboard {
  const secondButtons = secondKeyboard.inline_keyboard[0];
  return firstKeyboard.clone().add(...secondButtons);
}

export function shouldBeRowAfterButton(buttonIndex: number, maxButtonsInRowCount: number) {
  return buttonIndex % maxButtonsInRowCount !== 0;
}
