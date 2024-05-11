### RINbot on SUI


### Conversations

To create new conversation, you should add your conversationId to `CommonConversationId` (src/chains/conversations.config.ts)
Secondly, you should add version of your conversation into conversations config `conversations` (src/middleware/conversations/config.ts)

You must update the conversation version in conversations config each time when you do the changes to the conversation interface, otherwise it might lead to the unexpected behaviour for users' who were using the previous conversation version.

You must use the `enterConversation` method instead of `conversation.enter`.
This rule exists because `enterConversation` method saves the current version of conversation that the user entered in the user's session data (`activeConversation`).

The conversations version check middleware (src/middleware/conversation-version-check.ts) allows to check the conversation version each time when user interact with the bot. It compares the current version of user's conversation and the conversation version in config, and in case user is using the outdated (old) conversation version, it would forcibly close сonversation.

This conversation version check middleware exists to prevent cases when:
1. Coversation interface changed
2. User already entered conversation with old interface

Without the conversation version check middleware, user would stuck forever in the conversation without ability to do anything in the bot itself.
