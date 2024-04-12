/**
 * Is thrown when there is need to end conversation from inside.
 * Must be handled by conversations error boundary.
 */
export class EndConversationError extends Error {
  constructor(msg: string = '') {
    super(msg);
  }
}
