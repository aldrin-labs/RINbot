import closeConversation from '../closeConversation';
import confirm from '../confirm';

const closeButtons = closeConversation.inline_keyboard[0];
const confirmWithCloseKeyboard = confirm.clone().add(...closeButtons);

export default confirmWithCloseKeyboard;
