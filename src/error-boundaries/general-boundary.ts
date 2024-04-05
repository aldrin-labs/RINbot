import { BotError } from 'grammy';

export function generalErrorBoundaryHandler(err: BotError) {
  console.error('[Error Boundary Handler]', err);
}
