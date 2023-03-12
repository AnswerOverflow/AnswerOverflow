import { TRPCError } from "@trpc/server";
import { PermissionFlagsBits, PermissionResolvable } from "discord.js";
import { Source, sourceTypes } from "~api/router/context";
import {
	createInvalidSourceError,
	MISSING_PERMISSIONS_TO_EDIT_SERVER_MESSAGE
} from "~api/utils/permissions";
import {
	testAllPermissions,
	testAllSources,
	testAllSourceAndPermissionVariantsThatThrowErrors
} from "./utils";

describe("Test All Permissions", () => {
	it("should validate permissions are succeeding correctly", async () => {
		const successfullPermissions: PermissionResolvable[] = [];
		await testAllPermissions({
			permissionsThatShouldWork: ["AddReactions"],
			operation: (permission, shouldPermissionSucceed) => {
				if (shouldPermissionSucceed) {
					successfullPermissions.push(permission);
				}
			}
		});
		expect(successfullPermissions).toEqual(["AddReactions"]);
	});
	it("should validate permissions are failing correctly", async () => {
		const failedPermissions: PermissionResolvable[] = [];
		await testAllPermissions({
			permissionsThatShouldWork: ["AddReactions", "BanMembers"],
			operation: (permission, shouldPermissionSucceed) => {
				if (!shouldPermissionSucceed) {
					failedPermissions.push(permission);
				}
			}
		});
		expect(failedPermissions.length).toEqual(Object.keys(PermissionFlagsBits).length - 2);
	});
});

describe("Test All Sources", () => {
	it("should validate sources are succeeding correctly", async () => {
		const successfullSources: string[] = [];
		await testAllSources({
			sourcesThatShouldWork: ["discord-bot"],
			operation: (source, shouldSourceSucceed) => {
				if (shouldSourceSucceed) {
					successfullSources.push(source);
				}
			}
		});
		expect(successfullSources).toEqual(["discord-bot"]);
	});
	it("should validate sources are failing correctly", async () => {
		const failedSources: string[] = [];
		await testAllSources({
			sourcesThatShouldWork: ["discord-bot"],
			operation: (source, shouldSourceSucceed) => {
				if (!shouldSourceSucceed) {
					failedSources.push(source);
				}
			}
		});
		expect(failedSources.length).toEqual(sourceTypes.length - 1);
	});
});

describe("Test All Variants", () => {
	it("should validate sources and permissions are succeeding correctly", async () => {
		const successfulVariants: { source: string; permission: PermissionResolvable }[] = [];
		const sourcesThatShouldWork: Source[] = ["discord-bot"];
		const permissionsThatShouldWork: PermissionResolvable[] = ["AddReactions"];
		await testAllSourceAndPermissionVariantsThatThrowErrors({
			sourcesThatShouldWork: sourcesThatShouldWork,
			permissionsThatShouldWork: permissionsThatShouldWork,
			operation: ({ source, permission }) => {
				const shouldSourceSucceed = sourcesThatShouldWork.includes(source);
				const shouldPermissionSucceed = permissionsThatShouldWork.includes(permission);
				if (shouldSourceSucceed && shouldPermissionSucceed) {
					successfulVariants.push({ source, permission });
					return;
				}
				if (!shouldSourceSucceed && shouldPermissionSucceed) {
					throw createInvalidSourceError(source);
				} else if (shouldSourceSucceed && !shouldPermissionSucceed) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: MISSING_PERMISSIONS_TO_EDIT_SERVER_MESSAGE
					});
				} else {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message:
							createInvalidSourceError(source).message +
							"\n" +
							MISSING_PERMISSIONS_TO_EDIT_SERVER_MESSAGE
					});
				}
			},
			permissionFailureMessage: MISSING_PERMISSIONS_TO_EDIT_SERVER_MESSAGE
		});
		expect(successfulVariants).toEqual([{ source: "discord-bot", permission: "AddReactions" }]);
	});
});
