import { mockServer, mockServerWithFlags } from '@answeroverflow/db-mock';
import {
	addFlagsToServer,
	createServer,
	type Server,
} from '@answeroverflow/db';
import {
	mockAccountWithServersCallerCtx,
	testAllSourceAndPermissionVariantsThatThrowErrors,
} from '../../../test/utils';
import { serverRouter } from './server';

describe('Server Operations', () => {
	describe('Server Fetch', () => {
		let server: Server;
		beforeEach(async () => {
			server = mockServer();
			await createServer(server);
		});
		describe('By Id', () => {
			it('should succeed with permission variants', async () => {
				await testAllSourceAndPermissionVariantsThatThrowErrors({
					async operation({ source, permission }) {
						const account = await mockAccountWithServersCallerCtx(
							server,
							source,
							permission,
						);
						const router = serverRouter.createCaller(account.ctx);
						const fetchedServer = await router.byId(server.id);
						expect(fetchedServer).toEqual(addFlagsToServer(server));
					},
					sourcesThatShouldWork: ['discord-bot', 'web-client'],
					permissionsThatShouldWork: ['ManageGuild', 'Administrator'],
				});
			});
			it("should fail if the server doesn't exist", async () => {
				const account = await mockAccountWithServersCallerCtx(
					server,
					'discord-bot',
					'ManageGuild',
				);
				const router = serverRouter.createCaller(account.ctx);
				await expect(router.byId('nonexistent-server')).rejects.toThrow(
					'Server not found',
				);
			});
		});
	});
	describe('Set Read The Rules Consent Enabled', () => {
		it('should succeed setting read the rules consent enabled with permission variants', async () => {
			await testAllSourceAndPermissionVariantsThatThrowErrors({
				async operation({ source, permission }) {
					const server = mockServer();
					await createServer(server);
					const account = await mockAccountWithServersCallerCtx(
						server,
						source,
						permission,
					);
					const router = serverRouter.createCaller(account.ctx);
					await router.setReadTheRulesConsentEnabled({
						server,
						enabled: true,
					});
				},
				sourcesThatShouldWork: ['discord-bot'],
				permissionsThatShouldWork: ['ManageGuild', 'Administrator'],
			});
		});
		it('should succeed all variants for setting read the rules consent disabled', async () => {
			await testAllSourceAndPermissionVariantsThatThrowErrors({
				async operation({ source, permission }) {
					const server = mockServerWithFlags({
						flags: {
							readTheRulesConsentEnabled: true,
						},
					});
					await createServer({
						...server,
					});
					const account = await mockAccountWithServersCallerCtx(
						server,
						source,
						permission,
					);
					const router = serverRouter.createCaller(account.ctx);
					await router.setReadTheRulesConsentEnabled({
						server,
						enabled: false,
					});
				},
				sourcesThatShouldWork: ['discord-bot'],
				permissionsThatShouldWork: ['ManageGuild', 'Administrator'],
			});
		});
		it('should fail if read the rules consent is already enabled', async () => {
			const server = mockServerWithFlags({
				flags: {
					readTheRulesConsentEnabled: true,
				},
			});
			await createServer(server);
			const account = await mockAccountWithServersCallerCtx(
				server,
				'discord-bot',
				'ManageGuild',
			);
			const router = serverRouter.createCaller(account.ctx);
			await expect(
				router.setReadTheRulesConsentEnabled({
					server,
					enabled: true,
				}),
			).rejects.toThrowError('Read the rules consent already enabled');
		});
		it('should fail if read the rules consent is already disabled', async () => {
			const server = mockServerWithFlags({
				flags: {
					readTheRulesConsentEnabled: false,
				},
			});
			await createServer(server);
			const account = await mockAccountWithServersCallerCtx(
				server,
				'discord-bot',
				'ManageGuild',
			);
			const router = serverRouter.createCaller(account.ctx);
			await expect(
				router.setReadTheRulesConsentEnabled({
					server,
					enabled: false,
				}),
			).rejects.toThrowError('Read the rules consent already disabled');
		});
	});
	describe('Set require consent to display messages disabled', () => {
		it('should succeed setting require consent to display messages enabled with permission variants', async () => {
			await testAllSourceAndPermissionVariantsThatThrowErrors({
				async operation({ source, permission }) {
					const server = mockServer();
					await createServer(server);
					const account = await mockAccountWithServersCallerCtx(
						server,
						source,
						permission,
					);
					const router = serverRouter.createCaller(account.ctx);
					await router.setConsiderAllMessagesPublic({
						server,
						enabled: true,
					});
				},
				sourcesThatShouldWork: ['discord-bot'],
				permissionsThatShouldWork: ['ManageGuild', 'Administrator'],
			});
		});
	});
	describe('Set anonymize messages enabled', () => {
		it('should succeed setting anonymize messages enabled with permission variants', async () => {
			await testAllSourceAndPermissionVariantsThatThrowErrors({
				async operation({ source, permission }) {
					const server = mockServer();
					await createServer(server);
					const account = await mockAccountWithServersCallerCtx(
						server,
						source,
						permission,
					);
					const router = serverRouter.createCaller(account.ctx);
					await router.setAnonymizeMessages({
						server,
						enabled: true,
					});
				},
				sourcesThatShouldWork: ['discord-bot'],
				permissionsThatShouldWork: ['ManageGuild', 'Administrator'],
			});
		});
	});
});
