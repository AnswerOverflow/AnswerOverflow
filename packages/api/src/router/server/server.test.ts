import { mockServer, mockServerWithFlags } from "@answeroverflow/db-mock";
import { createServer, Server } from "@answeroverflow/db";
import { pickPublicServerData } from "~api/test/public-data";
import {
	mockAccountWithServersCallerCtx,
	testAllPublicAndPrivateDataVariants,
	testAllSourceAndPermissionVariantsThatThrowErrors
} from "~api/test/utils";
import { serverRouter } from "./server";

describe("Server Operations", () => {
	describe("Server Fetch", () => {
		let server: Server;
		beforeEach(async () => {
			server = mockServer({
				kickedTime: new Date()
			});
			await createServer(server);
		});
		it("should succeed fetching a server with permission variants", async () => {
			await testAllPublicAndPrivateDataVariants({
				async fetch({ source, permission }) {
					const account = await mockAccountWithServersCallerCtx(
						server,
						source,
						permission
					);
					const router = serverRouter.createCaller(account.ctx);
					const data = await router.byId(server.id);
					return {
						data,
						privateDataFormat: data,
						publicDataFormat: pickPublicServerData(server)
					};
				},
				permissionsThatShouldWork: ["ManageGuild", "Administrator"]
			});
		});
	});
	describe("Set Read The Rules Consent Enabled", () => {
		it("should succeed setting read the rules consent enabled with permission variants", async () => {
			await testAllSourceAndPermissionVariantsThatThrowErrors({
				async operation({ source, permission }) {
					const server = mockServer();
					await createServer(server);
					const account = await mockAccountWithServersCallerCtx(
						server,
						source,
						permission
					);
					const router = serverRouter.createCaller(account.ctx);
					await router.setReadTheRulesConsentEnabled({
						server,
						enabled: true
					});
				},
				sourcesThatShouldWork: ["discord-bot"],
				permissionsThatShouldWork: ["ManageGuild", "Administrator"]
			});
		});
		it("should succeed all variants for setting read the rules consent disabled", async () => {
			await testAllSourceAndPermissionVariantsThatThrowErrors({
				async operation({ source, permission }) {
					const server = mockServerWithFlags({
						flags: {
							readTheRulesConsentEnabled: true
						}
					});
					await createServer({
						...server
					});
					const account = await mockAccountWithServersCallerCtx(
						server,
						source,
						permission
					);
					const router = serverRouter.createCaller(account.ctx);
					await router.setReadTheRulesConsentEnabled({
						server,
						enabled: false
					});
				},
				sourcesThatShouldWork: ["discord-bot"],
				permissionsThatShouldWork: ["ManageGuild", "Administrator"]
			});
		});
		it("should fail if read the rules consent is already enabled", async () => {
			const server = mockServerWithFlags({
				flags: {
					readTheRulesConsentEnabled: true
				}
			});
			await createServer(server);
			const account = await mockAccountWithServersCallerCtx(
				server,
				"discord-bot",
				"ManageGuild"
			);
			const router = serverRouter.createCaller(account.ctx);
			await expect(
				router.setReadTheRulesConsentEnabled({
					server,
					enabled: true
				})
			).rejects.toThrowError("Read the rules consent already enabled");
		});
		it("should fail if read the rules consent is already disabled", async () => {
			const server = mockServerWithFlags({
				flags: {
					readTheRulesConsentEnabled: false
				}
			});
			await createServer(server);
			const account = await mockAccountWithServersCallerCtx(
				server,
				"discord-bot",
				"ManageGuild"
			);
			const router = serverRouter.createCaller(account.ctx);
			await expect(
				router.setReadTheRulesConsentEnabled({
					server,
					enabled: false
				})
			).rejects.toThrowError("Read the rules consent already disabled");
		});
	});
});
