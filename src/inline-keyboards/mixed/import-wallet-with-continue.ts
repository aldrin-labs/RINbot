import importWalletKeyboard from '../import-wallet';
import continueKeyboard from '../continue';

const continueButtons = continueKeyboard.inline_keyboard[0];
const importWalletWithContinueKeyboard = importWalletKeyboard
  .clone()
  .add(...continueButtons);

export default importWalletWithContinueKeyboard;
