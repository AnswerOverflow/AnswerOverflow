import type { BotRouterCaller } from "@answeroverflow/api";
import { createAnswerOveflowBotCtx } from "~discord-bot/utils/context";
import { callAPI } from "~discord-bot/utils/trpc";
export async function testOnlyAPICall<T>(ApiCall: (router: BotRouterCaller) => Promise<T>) {
  return await callAPI({
    ApiCall,
    getCtx: () => createAnswerOveflowBotCtx(),
  });
}
