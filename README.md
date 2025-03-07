# RINbot - Multichain Telegram Bot

## Overview

RINbot is a Telegram bot that allows users to interact with multiple blockchains. Currently, it fully supports the SUI blockchain with placeholder implementations for Solana and other chains coming soon.

## Supported Chains

- **SUI Network**: Fully implemented with support for wallet management, trading, liquidity pools, and coin creation.
- **Solana**: Coming soon - placeholder implementation is in place.
- **Other Chains**: Sonic SVM, Soon SVM, and Eclipse SVM are planned for future implementation.

## Chain Provider Architecture

The bot uses a provider-based architecture to support multiple chains:

- Each chain has its own provider implementation that implements the common interfaces:
  - `IChainProvider`: Main interface for chain-specific operations
  - `IWallet`: Interface for wallet operations
  - `ITransaction`: Interface for transaction operations
  - `IAsset`: Interface for asset/token operations
  - `IPool`: Interface for liquidity pool operations

- The chain provider is selected based on the user's selected chain in their session.

## Adding a New Chain

To add support for a new chain:

1. Create a new directory in `src/chains/providers/` for the chain
2. Implement the required interfaces for the chain
3. Update the `getChainProvider` function in `src/chains/providers/index.ts`
4. Add the chain to the `ChainType` enum in `src/chains/config.ts`


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

