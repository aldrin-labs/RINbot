/**
 * Timeout duration for Grammy webhook.
 * Should always be set to a value less than the timeout specified in the
 * deployment configuration of the Vercel cloud functions (versel.json, property: maxDuration).
 * This ensures that the bot responds to Telegram promptly, confirming the proper receipt of messages.
 * If TIMEOUT_GRAMMY_WEBHOOK exceeds the maxDuration in versel.json, it may lead to an infinite loop
 * of Telegram resending messages until they are processed.
 */
export const TIMEOUT_GRAMMY_WEBHOOK = 50_000;

/**
 * Timeout duration for Grammy middleware.
 * Used in the custom timeoutMiddleware to handle the graceful exit of an active conversation for a user.
 * To prevent users from getting stuck indefinitely in a timed-out conversation, TIMEOUT_GRAMMY_MIDDLEWARE
 * should always be set to a value less than TIMEOUT_GRAMMY_WEBHOOK.
 * This is crucial for scenarios where the bot is not using persistent storage, ensuring a smooth conversation exit.
 */
export const TIMEOUT_GRAMMY_MIDDLEWARE = TIMEOUT_GRAMMY_WEBHOOK - 1_000;

export const TIMEOUT_MESSAGE = "Command or conversation timed out. Please try again.";
