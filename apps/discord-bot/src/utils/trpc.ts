import {
  BotContextCreate,
  botRouter,
  BotRouterCaller,
  createBotContext,
} from "@answeroverflow/api";
import { container } from "@sapphire/framework";
import { TRPCError } from "@trpc/server";
import type { CommandInteraction } from "discord.js";
import type { ComponentEvent } from "@answeroverflow/reacord";
import { ephemeralReply } from "./utils";

export type TRPCStatusHandler<T> = {
  allowedErrors?: TRPCError["code"][] | TRPCError["code"];
  Ok?: (result: T) => void | Promise<void>;
  Error?: (message: string) => void | Promise<void>;
};

export type TRPCall<T> = {
  getCtx: () => Promise<BotContextCreate>;
  ApiCall: (router: BotRouterCaller) => Promise<T>;
} & TRPCStatusHandler<T>;

export async function callAPI<T>({
  getCtx,
  ApiCall,
  Ok = () => {},
  Error = () => {},
  allowedErrors,
}: TRPCall<T>) {
  try {
    const convertedCtx = await createBotContext(await getCtx());
    const caller = botRouter.createCaller(convertedCtx);
    const data = await ApiCall(caller); // Pass in the caller we created to ApiCall to make the request
    await Ok(data); // If no errors, Ok gets called with the API data
    return data;
  } catch (error) {
    if (error instanceof TRPCError) {
      if (!Array.isArray(allowedErrors)) allowedErrors = allowedErrors ? [allowedErrors] : [];
      if (!allowedErrors.includes(error.code)) {
        await Error(error.message);
      }
    } else {
      throw error;
    }
    return null;
  }
}

export function makeEphemeralErrorHandler<T>(
  interaction: CommandInteraction
): TRPCStatusHandler<T> {
  return {
    Error(message) {
      ephemeralReply(container.reacord, message, interaction);
    },
  };
}

export function makeComponentEventErrorHandler<T>(
  interaction: ComponentEvent
): TRPCStatusHandler<T> {
  return {
    Error(message) {
      interaction.ephemeralReply(message);
    },
  };
}

export function makeConsoleStatusHandler<T>({
  errorMessage,
  successMessage,
}: {
  errorMessage: string;
  successMessage?: string;
}): TRPCStatusHandler<T> {
  return {
    Error(message) {
      container.logger.error(errorMessage, message);
    },
    Ok() {
      if (successMessage) {
        container.logger.info(successMessage);
      }
    },
  };
}
