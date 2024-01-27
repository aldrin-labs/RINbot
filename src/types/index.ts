import { Context, SessionFlavor } from "grammy";


export interface SessionData {
    step: "main" | "buy" | "positions" | "wallet" | "wallet-deposit"; // which step of the form we are on
}

export type BotContext = Context & SessionFlavor<SessionData>;


