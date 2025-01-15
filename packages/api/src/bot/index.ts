import { sharedEnvs } from '@answeroverflow/env/shared';
import { TRPCError, initTRPC } from '@trpc/server';
import { ChannelType } from 'discord-api-types/v10';
import { SapphireClient } from '@sapphire/framework';
import superjson from 'superjson';
import { z } from 'zod';

type BotContext = {
	client: SapphireClient;
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
	enableIndexing: protectedProcedure
		.input(z.string())
		.mutation(async ({ input, ctx }) => {
			const channel = await ctx.client.channels.fetch(input);
			if (!channel) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'Channel not found',
				});
			}
			if (channel.isDMBased()) {
				throw new TRPCError({
					code: 'BAD_REQUEST',
					message:
						'Channel is a DM, can only enable indexing on server channels',
				});
			}
			if (channel.isThread()) {
				throw new TRPCError({
					code: 'BAD_REQUEST',
					message:
						'Channel is a thread, can only enable indexing on text based channels',
				});
			}
			if (channel.type === ChannelType.GuildCategory) {
				throw new TRPCError({
					code: 'BAD_REQUEST',
					message:
						'Channel is a category, can only enable indexing on text based channels',
				});
			}
			const clientPermissions = channel.permissionsFor(channel.client.user.id);
			if (!clientPermissions?.has('ReadMessageHistory')) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message:
						'You need to give the bot read message history permission to enable indexing',
				});
			}
			if (
				!clientPermissions.has('CreateInstantInvite') &&
				!channel.guild.vanityURLCode
			) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message:
						'You need to give the bot create invite permission to enable indexing',
				});
			}

			const invite = await channel.createInvite({
				maxAge: 0,
				maxUses: 0,
				reason: 'Channel indexing enabled invite',
				unique: false,
				temporary: false,
			});
			return {
				invite: invite.code,
			};
		}),
});

export type BotRouter = typeof botRouter;
