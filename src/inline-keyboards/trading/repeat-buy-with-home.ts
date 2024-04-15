import goHome from '../goHome';
import repeatSameBuyKeyboard from './repeat-same-buy';

const homeButtons = goHome.inline_keyboard[0];
const repeatSameBuyWithHomeKeyboard = repeatSameBuyKeyboard.clone().add(...homeButtons);

export default repeatSameBuyWithHomeKeyboard;
