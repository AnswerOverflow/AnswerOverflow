import {
	mockAccountWithServersCallerCtx,
	testAllSources,
} from '~api/test/utils';
import {
	type Server,
	type DiscordAccount,
	createServer,
	createDiscordAccount,
	createUserServerSettings,
	findUserServerSettingsById,
} from '@answeroverflow/db';
import { userServerSettingsRouter } from './user-server-settings';
import { mockDiscordAccount, mockServer } from '@answeroverflow/db-mock';
import { NOT_AUTHORIZED_MESSAGE } from '~api/utils/permissions';
import {
	AUTOMATED_CONSENT_SOURCES,
	type ConsentSource,
	CONSENT_ALREADY_DENIED_MESSAGE,
	CONSENT_ALREADY_GRANTED_MESSAGE,
	CONSENT_EXPLICITLY_SET_MESSAGE,
	type ManageAccountSource,
	MANUAL_CONSENT_SOURCES,
	MESSAGE_INDEXING_ALREADY_DISABLED_MESSAGE,
	MESSAGE_INDEXING_ALREADY_ENABLED_MESSAGE,
} from './types';

let server: Server;
let discordAccount: DiscordAccount;
let discordAccount2: DiscordAccount;
beforeEach(async () => {
	server = mockServer();
	discordAccount = mockDiscordAccount();
	discordAccount2 = mockDiscordAccount();

	await createServer(server);
	await createDiscordAccount(discordAccount);
	await createDiscordAccount(discordAccount2);
});

export async function testAllToggleIndexingScenarios(
	operation: ({
		manageAccountSource,
		router,
		account,
	}: {
		manageAccountSource: ManageAccountSource;
		account: DiscordAccount;
		router: ReturnType<typeof userServerSettingsRouter.createCaller>;
	}) => Promise<void>,
) {
	const { ctx, account } = await mockAccountWithServersCallerCtx(
		server,
		'discord-bot',
		undefined,
	);
	const router = userServerSettingsRouter.createCaller(ctx);
	await operation({
		manageAccountSource: 'manage-account-menu',
		account,
		router,
	});
}

export async function testAllBotAutomatedGrantConsentScenarios(
	operation: ({
		consentSource,
		router,
		account,
	}: {
		consentSource: ConsentSource;
		account: DiscordAccount;
		router: ReturnType<typeof userServerSettingsRouter.createCaller>;
	}) => Promise<void>,
) {
	await Promise.all(
		[...AUTOMATED_CONSENT_SOURCES].map(async (consentSource) => {
			const { ctx, account } = await mockAccountWithServersCallerCtx(
				server,
				'discord-bot',
				undefined,
			);
			const router = userServerSettingsRouter.createCaller(ctx);
			await operation({
				consentSource,
				account,
				router,
			});
		}),
	);
}

export async function testAllBotManualGrantConsentScenarios(
	operation: ({
		consentSource,
		router,
		account,
	}: {
		consentSource: ConsentSource;
		account: DiscordAccount;
		router: ReturnType<typeof userServerSettingsRouter.createCaller>;
	}) => Promise<void>,
) {
	await Promise.all(
		[...MANUAL_CONSENT_SOURCES].map(async (consentSource) => {
			const { ctx, account } = await mockAccountWithServersCallerCtx(
				server,
				'discord-bot',
				undefined,
			);
			const router = userServerSettingsRouter.createCaller(ctx);
			await operation({
				consentSource,
				account,
				router,
			});
		}),
	);
}

describe('User Server Settings Operations', () => {
	describe('User Server Settings By Id', () => {
		beforeEach(async () => {
			await createUserServerSettings({
				serverId: server.id,
				userId: discordAccount.id,
			});
		});
		it('should fail all variants getting user server settings by id as a different user', async () => {
			await testAllSources({
				async operation(source) {
					const { ctx } = await mockAccountWithServersCallerCtx(server, source);
					const router = userServerSettingsRouter.createCaller(ctx);
					await expect(router.byId(server.id)).rejects.toThrowError();
				},
			});
		});
		it('should succeed all variants getting user server settings by id as that user', async () => {
			await testAllSources({
				async operation(source) {
					const { ctx } = await mockAccountWithServersCallerCtx(
						server,
						source,
						undefined,
						discordAccount,
					);
					const router = userServerSettingsRouter.createCaller(ctx);
					const userServerSettings = await router.byId(server.id);
					expect(userServerSettings).toBeDefined();
					expect(userServerSettings?.serverId).toEqual(server.id);
					expect(userServerSettings?.userId).toEqual(discordAccount.id);
				},
			});
		});
	});
	describe('Set Indexing Disabled', () => {
		describe('Failures', () => {
			it('should fail all variants setting indexing disabled as a different user', async () => {
				await testAllToggleIndexingScenarios(async ({ router }) => {
					await expect(
						router.setIndexingDisabled({
							data: {
								serverId: server.id,
								user: mockDiscordAccount(), // use a different user than the caller
								flags: {
									messageIndexingDisabled: true,
								},
							},
							source: 'manage-account-menu',
						}),
					).rejects.toThrowError(NOT_AUTHORIZED_MESSAGE);
				});
			});
			it('should fail all variants of setting indexing enabled when it is already enabled', async () => {
				await testAllToggleIndexingScenarios(async ({ router, account }) => {
					await createDiscordAccount(account);
					await createUserServerSettings({
						serverId: server.id,
						userId: account.id,
						flags: {
							messageIndexingDisabled: false,
						},
					});
					await expect(
						router.setIndexingDisabled({
							data: {
								serverId: server.id,
								user: account,
								flags: {
									messageIndexingDisabled: false,
								},
							},
							source: 'manage-account-menu',
						}),
					).rejects.toThrowError(MESSAGE_INDEXING_ALREADY_ENABLED_MESSAGE);
				});
			});
			it('should fail all variants of setting indexing disabled when it is already disabled', async () => {
				await testAllToggleIndexingScenarios(async ({ router, account }) => {
					await createDiscordAccount(account);
					await createUserServerSettings({
						serverId: server.id,
						userId: account.id,
						flags: {
							messageIndexingDisabled: true,
						},
					});
					await expect(
						router.setIndexingDisabled({
							data: {
								serverId: server.id,
								user: account,
								flags: {
									messageIndexingDisabled: true,
								},
							},
							source: 'manage-account-menu',
						}),
					).rejects.toThrowError(MESSAGE_INDEXING_ALREADY_DISABLED_MESSAGE);
				});
			});
		});
		describe('Successes', () => {
			it('should succeed all variants setting indexing disabled as that user', async () => {
				await testAllToggleIndexingScenarios(async ({ router, account }) => {
					const userServerSettings = await router.setIndexingDisabled({
						data: {
							serverId: server.id,
							user: account,
							flags: {
								messageIndexingDisabled: true,
							},
						},
						source: 'manage-account-menu',
					});
					expect(userServerSettings).toBeDefined();
					expect(userServerSettings?.serverId).toEqual(server.id);
					expect(userServerSettings?.userId).toEqual(account.id);
					expect(userServerSettings?.flags.messageIndexingDisabled).toEqual(
						true,
					);
				});
			});
			it('should succeed all variants of setting indexing disabled on a user that has consented to publicly display their messages', async () => {
				await testAllToggleIndexingScenarios(async ({ router, account }) => {
					await createDiscordAccount(account);
					await createUserServerSettings({
						serverId: server.id,
						userId: account.id,
						flags: {
							canPubliclyDisplayMessages: true,
						},
					});
					const userServerSettings = await router.setIndexingDisabled({
						data: {
							serverId: server.id,
							user: account,
							flags: {
								messageIndexingDisabled: true,
							},
						},
						source: 'manage-account-menu',
					});
					expect(userServerSettings).toBeDefined();
					expect(userServerSettings?.serverId).toEqual(server.id);
					expect(userServerSettings?.userId).toEqual(account.id);
					expect(userServerSettings?.flags.messageIndexingDisabled).toEqual(
						true,
					);
					expect(userServerSettings?.flags.canPubliclyDisplayMessages).toEqual(
						false,
					);
				});
			});
		});
	});
	describe('Set Consent Granted', () => {
		describe('Successes', () => {
			it('should succeed all variants setting consent granted as that user', async () => {
				await testAllBotManualGrantConsentScenarios(
					async ({ router, account, consentSource }) => {
						await router.setConsentGranted({
							data: {
								serverId: server.id,
								user: account,
								flags: {
									canPubliclyDisplayMessages: true,
								},
							},
							source: consentSource,
						});
						const foundUserServerSettings = await findUserServerSettingsById({
							serverId: server.id,
							userId: account.id,
						});
						expect(
							foundUserServerSettings?.flags.canPubliclyDisplayMessages,
						).toEqual(true);
					},
				);
			});
			it('should succeed all manual variants setting consent revoked for a user who has granted consent', async () => {
				await testAllBotManualGrantConsentScenarios(
					async ({ router, account, consentSource }) => {
						await createDiscordAccount(account);
						await createUserServerSettings({
							serverId: server.id,
							userId: account.id,
							flags: {
								canPubliclyDisplayMessages: true,
							},
						});
						await router.setConsentGranted({
							data: {
								serverId: server.id,
								user: account,
								flags: {
									canPubliclyDisplayMessages: false,
								},
							},
							source: consentSource,
						});
						const foundUserServerSettings = await findUserServerSettingsById({
							serverId: server.id,
							userId: account.id,
						});
						expect(
							foundUserServerSettings?.flags.canPubliclyDisplayMessages,
						).toEqual(false);
					},
				);
			});
		});
		describe('Failures', () => {
			it('should fail all variants setting consent granted as a different user', async () => {
				await testAllBotManualGrantConsentScenarios(
					async ({ router, consentSource }) => {
						await expect(
							router.setConsentGranted({
								data: {
									serverId: server.id,
									user: mockDiscordAccount(), // use a different user than the caller
									flags: {
										canPubliclyDisplayMessages: true,
									},
								},
								source: consentSource,
							}),
						).rejects.toThrowError(NOT_AUTHORIZED_MESSAGE);
					},
				);
			});
			it('should fail all variants setting manually consent granted when it is already granted', async () => {
				await testAllBotManualGrantConsentScenarios(
					async ({ router, account, consentSource }) => {
						await createDiscordAccount(account);
						await createUserServerSettings({
							serverId: server.id,
							userId: account.id,
							flags: {
								canPubliclyDisplayMessages: true,
							},
						});
						await expect(
							router.setConsentGranted({
								data: {
									serverId: server.id,
									user: account,
									flags: {
										canPubliclyDisplayMessages: true,
									},
								},
								source: consentSource,
							}),
						).rejects.toThrowError(CONSENT_ALREADY_GRANTED_MESSAGE);
					},
				);
			});
			it('should fail all variants setting manually consent revoked when it is already revoked', async () => {
				await testAllBotManualGrantConsentScenarios(
					async ({ router, account, consentSource }) => {
						await createDiscordAccount(account);
						await createUserServerSettings({
							serverId: server.id,
							userId: account.id,
							flags: {
								canPubliclyDisplayMessages: false,
							},
						});
						await expect(
							router.setConsentGranted({
								data: {
									serverId: server.id,
									user: account,
									flags: {
										canPubliclyDisplayMessages: false,
									},
								},
								source: consentSource,
							}),
						).rejects.toThrowError(CONSENT_ALREADY_DENIED_MESSAGE);
					},
				);
			});
			it('should fail all variants setting automated consent granted when it is already granted', async () => {
				await testAllBotAutomatedGrantConsentScenarios(
					async ({ router, account, consentSource }) => {
						await createDiscordAccount(account);
						await createUserServerSettings({
							serverId: server.id,
							userId: account.id,
							flags: {
								canPubliclyDisplayMessages: true,
							},
						});
						await expect(
							router.setConsentGranted({
								data: {
									serverId: server.id,
									user: account,
									flags: {
										canPubliclyDisplayMessages: true,
									},
								},
								source: consentSource,
							}),
						).rejects.toThrowError(CONSENT_EXPLICITLY_SET_MESSAGE);
					},
				);
			});
			it('should fail all variants setting automated consent revoked when it is already revoked', async () => {
				await testAllBotAutomatedGrantConsentScenarios(
					async ({ router, account, consentSource }) => {
						await createDiscordAccount(account);
						await createUserServerSettings({
							serverId: server.id,
							userId: account.id,
							flags: {
								canPubliclyDisplayMessages: false,
							},
						});
						await expect(
							router.setConsentGranted({
								data: {
									serverId: server.id,
									user: account,
									flags: {
										canPubliclyDisplayMessages: false,
									},
								},
								source: consentSource,
							}),
						).rejects.toThrowError(CONSENT_EXPLICITLY_SET_MESSAGE);
					},
				);
			});
		});
	});
});
