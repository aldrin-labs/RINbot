import closeConversation from '../closeConversation';
import continueKeyboard from '../continue';

const cancelButtons = closeConversation.inline_keyboard[0];
const continueWithCancelKeyboard = continueKeyboard
  .clone()
  .add(...cancelButtons);

export default continueWithCancelKeyboard;
