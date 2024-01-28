import { bot } from '../src/index'
import { webhookCallback } from 'grammy'

export const config = { runtime: 'edge' }

// webhookCallback will make sure that the correct middleware(listener) function is called
export default webhookCallback(bot, 'std/http')
