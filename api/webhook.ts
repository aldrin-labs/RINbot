import { bot } from '../src';
import { webhookCallback } from 'grammy';
import { TIMEOUT_GRAMMY_WEBHOOK } from '../src/config/timeout.config';

// webhookCallback will make sure that the correct middleware(listener) function is called
export default webhookCallback(bot, 'http', 'throw', TIMEOUT_GRAMMY_WEBHOOK);
