import { sharedEnvs } from '@answeroverflow/env/shared';
import { TRPCError, initTRPC } from '@trpc/server';
import { ChannelType } from 'discord-api-types/v10';
import { Client } from 'discord.js';
import superjson from 'superjson';
import { z } from 'zod';

type BotContext = {
	client: Client;
	token: string | undefined;
};

const t = initTRPC.context<BotContext>().create({
	transformer: superjson,
	errorFormatter({ shape }) {
		return shape;
	},
});

export const router = t.router;
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
	// read bearer token from header
	if (ctx.token !== sharedEnvs.DISCORD_CLIENT_SECRET) {
		throw new TRPCError({ code: 'UNAUTHORIZED' });
	}
	return next();
});

export const botRouter = router({
	getTags: protectedProcedure
		.input(z.string())
		.query(async ({ input, ctx }) => {
			const channel = await ctx.client.channels.fetch(input);
			if (!channel || channel.type !== ChannelType.GuildForum) {
				return null;
			}
			return channel.availableTags;
		}),
});

export type BotRouter = typeof botRouter;
