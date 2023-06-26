import { findManyServersById } from '@answeroverflow/db';
import {
	withDiscordAccountProcedure,
	withUserServersProcedure,
	publicProcedure,
	router,
} from './trpc';
import { PermissionsBitField } from 'discord.js';
export const authRouter = router({
	getSession: publicProcedure.query(({ ctx }) => {
		return ctx.session;
	}),
	getSecretMessage: withDiscordAccountProcedure.query(() => {
		// testing type validation of overridden next-auth Session in @answeroverflow/auth package
		return 'you can see this secret message!';
	}),
	getServers: withUserServersProcedure.query(({ ctx }) => {
		return ctx.userServers;
	}),
	getServersForOnboarding: withUserServersProcedure.query(async ({ ctx }) => {
		const serversToFetch = ctx.userServers.filter((server) => {
			const permissionBitfield = new PermissionsBitField(
				BigInt(server.permissions),
			);
			return (
				permissionBitfield.has('ManageGuild') ||
				permissionBitfield.has('Administrator') ||
				server.owner
			);
		});
		const fetchedServers = await findManyServersById(
			serversToFetch.map((server) => server.id),
		);
		const serverLookup = new Map(
			fetchedServers.map((server) => [server.id, server]),
		);

		const serversWithMetaData = serversToFetch.map((server) => {
			let highestRole: 'Manage Guild' | 'Administrator' | 'Owner' =
				'Manage Guild';
			const permissionBitfield = new PermissionsBitField(
				BigInt(server.permissions),
			);
			if (permissionBitfield.has('Administrator')) {
				highestRole = 'Administrator';
			}
			if (server.owner) {
				highestRole = 'Owner';
			}
			return {
				...server,
				highestRole,
				hasBot: serverLookup.get(server.id)?.kickedTime === null,
			};
		});

		const serversInOrderOfPermissions = serversWithMetaData.sort((a, b) => {
			// In this order:
			// has bot + owner, has bot + admin, has bot + manage guild
			// no bot + owner, no bot + admin, no bot + manage guild
			const aPermissions = new PermissionsBitField(BigInt(a.permissions));
			const bPermissions = new PermissionsBitField(BigInt(b.permissions));
			const aHasBot = serverLookup.get(a.id)?.kickedTime === null;
			const bHasBot = serverLookup.get(b.id)?.kickedTime === null;
			const score = aPermissions.has('Administrator')
				? -1
				: bPermissions.has('Administrator')
				? 1
				: aPermissions.has('ManageGuild')
				? -1
				: bPermissions.has('ManageGuild')
				? 1
				: 0;

			if (aHasBot && bHasBot) {
				return score;
			}

			if (aHasBot && !bHasBot) {
				return -1;
			}

			if (!aHasBot && bHasBot) {
				return 1;
			}
			return score;
		});
		return serversInOrderOfPermissions;
	}),
	getDiscordAccount: withDiscordAccountProcedure.query(({ ctx }) => {
		return ctx.discordAccount;
	}),
});
