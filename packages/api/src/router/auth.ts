import { findManyServersById } from '@answeroverflow/db';
import {
	withDiscordAccountProcedure,
	withUserServersProcedure,
	publicProcedure,
	router,
} from './trpc';
import { PermissionsBitField } from '../utils/types';

export const authRouter = router({
	getSession: publicProcedure
		.meta({
			tenantAuthAccessible: true,
		})
		.query(({ ctx }) => {
			return ctx.session;
		}),
	getSecretMessage: withDiscordAccountProcedure.query(() => {
		// testing type validation of overridden next-auth Session in @answeroverflow/auth package
		return 'you can see this secret message!';
	}),
	getServers: withUserServersProcedure
		.meta({
			tenantAuthAccessible: true,
		})
		.query(({ ctx }) => {
			return ctx.userServers;
		}),
	getServersForOnboarding: withUserServersProcedure.query(async ({ ctx }) => {
		const serversToFetch = ctx.userServers.filter((server) => {
			return (
				PermissionsBitField.any(BigInt(server.permissions), [
					'ManageGuild',
					'Administrator',
				]) || server.owner
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
			if (
				PermissionsBitField.has(BigInt(server.permissions), 'Administrator')
			) {
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
			const aPermissions = BigInt(a.permissions);
			const bPermissions = BigInt(b.permissions);
			const aHasBot = serverLookup.get(a.id)?.kickedTime === null;
			const bHasBot = serverLookup.get(b.id)?.kickedTime === null;
			const score = PermissionsBitField.has(aPermissions, 'Administrator')
				? -1
				: PermissionsBitField.has(bPermissions, 'Administrator')
					? 1
					: PermissionsBitField.has(aPermissions, 'ManageGuild')
						? -1
						: PermissionsBitField.has(bPermissions, 'ManageGuild')
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
