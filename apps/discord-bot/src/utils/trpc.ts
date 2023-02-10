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
  Ok?: (result: T) => void | Promise<void>;
  Error?: (message: string) => void | Promise<void>;
};

export type TRPCall<T> = {
  getCtx: () => Promise<BotContextCreate>;
  apiCall: (router: BotRouterCaller) => Promise<T>;
} & TRPCStatusHandler<T>;

export async function callWithAllowedErrors<T>({
  allowedErrors,
  call,
}: {
  call: () => Promise<T>;
  allowedErrors?: TRPCError["code"] | TRPCError["code"][];
}) {
  try {
    return await call();
  } catch (error) {
    if (!(error instanceof TRPCError)) throw error;
    if (!Array.isArray(allowedErrors)) allowedErrors = allowedErrors ? [allowedErrors] : [];
    if (!allowedErrors.includes(error.code)) {
      return null;
    } else {
      throw error;
    }
  }
}

export async function callAPI<T>({ getCtx, apiCall, Ok = () => {}, Error = () => {} }: TRPCall<T>) {
  try {
    const convertedCtx = await createBotContext(await getCtx());
    const caller = botRouter.createCaller(convertedCtx);
    const data = await apiCall(caller);
    await Ok(data);
    return data;
  } catch (error) {
    if (!(error instanceof TRPCError)) throw error;
    await Error(error.message);
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
