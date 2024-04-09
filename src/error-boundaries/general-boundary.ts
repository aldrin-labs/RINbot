import { BotError } from 'grammy';

/**
 * Error boundary which should be used to handle all the arrived bot errors.
 */
export function generalErrorBoundaryHandler(err: BotError) {
  console.error('[Error Boundary Handler]', err);
}
