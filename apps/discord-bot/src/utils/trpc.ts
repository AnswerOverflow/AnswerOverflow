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

type TRPCStatusHandler<T> = {
  Ok?: (result: T) => void | Promise<void>;
  Error?: (error: TRPCError) => void;
  allowedErrors?: TRPCError["code"][] | TRPCError["code"];
};

type TRPCall<T> = {
  getCtx: () => Promise<BotContextCreate>;
  ApiCall: (router: BotRouterCaller) => Promise<T>;
} & TRPCStatusHandler<T>;

export async function callAPI<T>({
  getCtx,
  ApiCall,
  Ok = () => {},
  Error = () => {},
  allowedErrors = "NOT_FOUND",
}: TRPCall<T>) {
  try {
    const convertedCtx = await createBotContext(await getCtx());
    const caller = botRouter.createCaller(convertedCtx);
    const data = await ApiCall(caller); // Pass in the caller we created to ApiCall to make the request
    await Ok(data); // If no errors, Ok gets called with the API data
    return data;
  } catch (error) {
    if (error instanceof TRPCError) {
      if (!allowedErrors.includes(error.code)) {
        Error(error);
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
    Error(error) {
      ephemeralReply(container.reacord, "Error: " + error.message, interaction);
    },
  };
}

export function makeButtonErrorHandler<T>(interaction: ComponentEvent): TRPCStatusHandler<T> {
  return {
    Error(error) {
      interaction.ephemeralReply("Error: " + error.message);
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
    Error(error) {
      container.logger.error(errorMessage, error.code, error.message);
    },
    Ok() {
      if (successMessage) {
        container.logger.info(successMessage);
      }
    },
  };
}
