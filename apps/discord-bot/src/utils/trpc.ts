import {
	type BotContextCreate,
	type BotRouterCaller,
	botRouter,
	createBotContext,
} from '@answeroverflow/api';
import { TRPCError } from '@trpc/server';
import {
	ChatInputCommandInteraction,
	MessageComponentInteraction,
} from 'discord.js';

export type TRPCStatusHandler<T> = {
	Ok?: (result: T) => unknown | Promise<unknown>;
	Error?: (
		error: TRPCError,
		messageWithCode: string,
	) => unknown | Promise<unknown>;
};

export type TRPCCall<T> = {
	getCtx: () => Promise<BotContextCreate>;
	apiCall: (router: BotRouterCaller) => Promise<T>;
} & TRPCStatusHandler<T>;

export async function callWithAllowedErrors<T>({
	allowedErrors,
	call,
}: {
	call: () => Promise<T>;
	allowedErrors?: TRPCError['code'] | TRPCError['code'][];
}) {
	try {
		return await call();
	} catch (error) {
		if (!(error instanceof TRPCError)) throw error;
		if (!Array.isArray(allowedErrors))
			allowedErrors = allowedErrors ? [allowedErrors] : [];
		if (allowedErrors.includes(error.code)) {
			return null;
		} else {
			throw error;
		}
	}
}

export async function callAPI<T>({
	getCtx,
	apiCall,
	Ok = () => {},
	Error = () => {},
}: TRPCCall<T>) {
	try {
		const convertedCtx = await createBotContext(await getCtx());
		const caller = botRouter.createCaller(convertedCtx);
		const data = await apiCall(caller);
		await Ok(data);
		return data;
	} catch (error) {
		if (!(error instanceof TRPCError)) throw error;
		if (error.code === 'INTERNAL_SERVER_ERROR') {
			const originalError = error.message;
			error.message =
				"An unexpected error occurred. We've been notified and are looking into it.";
			await Error(
				error,
				"An unexpected error occurred. We've been notified and are looking into it.",
			);
			error.message = originalError;
			throw error;
		}
		await Error(error, error.message);
		return null;
	}
}
export function oneTimeStatusHandler(
	interaction: MessageComponentInteraction | ChatInputCommandInteraction,
	message: string,
) {
	if (interaction.deferred) return interaction.editReply({ content: message });
	else
		return interaction.reply({
			content: message,
			ephemeral: true,
		});
}
