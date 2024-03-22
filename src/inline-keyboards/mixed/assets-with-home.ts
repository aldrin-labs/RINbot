import goHome from '../goHome';
import assets from '../assets';

const homeButtons = goHome.inline_keyboard[0];
const assetsWithHomeKeyboard = assets.clone().add(...homeButtons);

export default assetsWithHomeKeyboard;
