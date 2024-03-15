import { Context, MiddlewareFn } from "grammy";
import { TIMEOUT_GRAMMY_MIDDLEWARE, TIMEOUT_MESSAGE } from "../config/timeout.config";
import { BotContext } from "../types";

/**
 * Executes the provided action with a specified timeout.
 * @param {() => Promise<void>} action - The action to be executed.
 * @param {number} timeout - The timeout duration in milliseconds.
 * @param {string} timeoutMessage - The error message to be used if the action times out.
 * @returns {Promise<void>} - A Promise that resolves when the action is complete or rejects with a timeout error.
 */
async function withTimeout(action: () => Promise<void>, timeout: number, timeoutMessage: string): Promise<void> {
  const actionPromise = action();

  const timeoutPromise = new Promise<void>((_, reject) => {
    setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeout);
  });

  await Promise.race([actionPromise, timeoutPromise]);
}

/**
 * Middleware to control execution time with timeout.
 * @param {Context<BotContext>} ctx - The context object representing the current state of the bot.
 * @param {MiddlewareFn<BotContext>} next - The next middleware or handler in the chain.
 * @returns {Promise<void>} - A Promise that resolves when the middleware completes its execution.
 */
export const timeoutMiddleware: MiddlewareFn<BotContext> = async (ctx, next) => {
  try {
    await withTimeout(
      async () => {
        // Execute the next middleware or handler
        await next();
      },
      TIMEOUT_GRAMMY_MIDDLEWARE,
      TIMEOUT_MESSAGE,
    );
  } catch (error) {
    // Check if the error is of type 'Error' or use a type assertion
    if (error instanceof Error) {
      // Handle the timeout error (e.g., send a reply)
      await ctx.conversation.exit();
      await ctx.reply(error.message);
    } else {
      // Handle other types of errors or use a type assertion
      console.error("Unexpected error:", error);
      await ctx.reply(`Unexpected error: ${error}`);
    }
  }
};
