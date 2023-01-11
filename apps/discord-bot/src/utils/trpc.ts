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

type TRPCall<T> = {
  getCtx: () => Promise<BotContextCreate>;
  // eslint-disable-next-line no-unused-vars
  ApiCall: (router: BotRouterCaller) => Promise<T>;
  // eslint-disable-next-line no-unused-vars
  Ok?: (result: T) => void;
  // eslint-disable-next-line no-unused-vars
  Error?: (error: TRPCError) => void;
};

export async function callAPI<T>({ getCtx, ApiCall, Ok = () => {}, Error = () => {} }: TRPCall<T>) {
  try {
    const converted_ctx = await createBotContext(await getCtx());
    const caller = botRouter.createCaller(converted_ctx);
    const data = await ApiCall(caller); // Pass in the caller we created to ApiCall to make the request
    Ok(data); // If no errors, Ok gets called with the API data
    return data;
  } catch (error) {
    if (error instanceof TRPCError) {
      Error(error);
    } else {
      throw error;
    }
    return null;
  }
}

export async function callApiWithEphemeralErrorHandler<T>(
  call: Omit<TRPCall<T>, "Error">,
  interaction: CommandInteraction
) {
  return await callAPI({
    ...call,
    Error(error) {
      ephemeralReply(container.reacord, "Error: " + error.message, interaction);
    },
  });
}

export async function callApiWithButtonErrorHandler<T>(
  call: Omit<TRPCall<T>, "Error">,
  interaction: ComponentEvent
) {
  return await callAPI({
    ...call,
    Error(error) {
      interaction.ephemeralReply("Error: " + error.message);
    },
  });
}

export async function callApiWithConsoleStatusHandler<T>(
  call: Omit<
    TRPCall<T> & {
      success_message?: string | undefined;
      error_message: string;
    },
    "Error" | "Ok"
  >
) {
  return await callAPI({
    ...call,
    Error(error) {
      container.logger.error(call.error_message, error.code, error.message);
    },
    Ok() {
      if (call.success_message) {
        container.logger.info(call.success_message);
      }
    },
  });
}
