
import { bot} from '../src'
import { webhookCallback } from 'grammy'
import { TIMEOUT_GRAMMY_WEBHOOK } from '../src/config/timeout.config'

export const config = { runtime: 'edge' }

// webhookCallback will make sure that the correct middleware(listener) function is called
export default webhookCallback(
    bot,
    'std/http',
    (...args) => {
        console.debug('[webhookCallback] timed out')
    },
    TIMEOUT_GRAMMY_WEBHOOK
)
