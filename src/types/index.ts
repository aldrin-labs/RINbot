import { Context, SessionFlavor } from "grammy";
import { type Conversation, type ConversationFlavor, conversations, createConversation } from "@grammyjs/conversations";



export interface SessionData {
    step: "main" | "buy" | "positions" | "wallet" | "wallet-deposit"; // which step of the form we are on
    privateKey: string,
    publicKey: string
}

export type BotContext = Context & SessionFlavor<SessionData> & ConversationFlavor;

export type MyConversation = Conversation<BotContext>;

