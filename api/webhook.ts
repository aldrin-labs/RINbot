
import { BOT_TOKEN, bot} from '../src'
import { webhookCallback } from 'grammy'
import { TIMEOUT_GRAMMY_WEBHOOK } from '../src/config/timeout.config'

export const config = { runtime: 'edge' }

// webhookCallback will make sure that the correct middleware(listener) function is called
export default webhookCallback( bot, 'std/http',{ 
        timeoutMilliseconds: TIMEOUT_GRAMMY_WEBHOOK,
        secretToken: BOT_TOKEN
    }
)
