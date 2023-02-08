import { TRPCError } from "@trpc/server";
import { PermissionFlagsBits, PermissionResolvable } from "discord.js";
import { Source, source_types } from "~api/router/context";
import {
  createInvalidSourceError,
  MISSING_PERMISSIONS_TO_EDIT_SERVER_MESSAGE,
} from "~api/utils/permissions";
import { testAllPermissions, testAllSources, testAllVariantsThatThrowErrors } from "./utils";

describe("Test All Permissions", () => {
  it("should validate permissions are succeeding correctly", async () => {
    const successfull_permissions: PermissionResolvable[] = [];
    await testAllPermissions({
      permissionsThatShouldWork: ["AddReactions"],
      operation: (permission, should_permission_succeed) => {
        if (should_permission_succeed) {
          successfull_permissions.push(permission);
        }
      },
    });
    expect(successfull_permissions).toEqual(["AddReactions"]);
  });
  it("should validate permissions are failing correctly", async () => {
    const failed_permissions: PermissionResolvable[] = [];
    await testAllPermissions({
      permissionsThatShouldWork: ["AddReactions", "BanMembers"],
      operation: (permission, should_permission_succeed) => {
        if (!should_permission_succeed) {
          failed_permissions.push(permission);
        }
      },
    });
    expect(failed_permissions.length).toEqual(Object.keys(PermissionFlagsBits).length - 2);
  });
});

describe("Test All Sources", () => {
  it("should validate sources are succeeding correctly", async () => {
    const successfull_sources: string[] = [];
    await testAllSources({
      sourcesThatShouldWork: ["discord-bot"],
      operation: (source, should_source_succeed) => {
        if (should_source_succeed) {
          successfull_sources.push(source);
        }
      },
    });
    expect(successfull_sources).toEqual(["discord-bot"]);
  });
  it("should validate sources are failing correctly", async () => {
    const failed_sources: string[] = [];
    await testAllSources({
      sourcesThatShouldWork: ["discord-bot"],
      operation: (source, should_source_succeed) => {
        if (!should_source_succeed) {
          failed_sources.push(source);
        }
      },
    });
    expect(failed_sources.length).toEqual(source_types.length - 1);
  });
});

describe("Test All Variants", () => {
  it("should validate sources and permissions are succeeding correctly", async () => {
    const successful_variants: { source: string; permission: PermissionResolvable }[] = [];
    const sources_that_should_work: Source[] = ["discord-bot"];
    const permissions_that_should_work: PermissionResolvable[] = ["AddReactions"];
    await testAllVariantsThatThrowErrors({
      sourcesThatShouldWork: sources_that_should_work,
      permissionsThatShouldWork: permissions_that_should_work,
      operation: ({ source, permission }) => {
        const should_source_succeed = sources_that_should_work.includes(source);
        const should_permission_succeed = permissions_that_should_work.includes(permission);
        if (should_source_succeed && should_permission_succeed) {
          successful_variants.push({ source, permission });
          return;
        }
        if (!should_source_succeed && should_permission_succeed) {
          throw createInvalidSourceError(source);
        } else if (should_source_succeed && !should_permission_succeed) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: MISSING_PERMISSIONS_TO_EDIT_SERVER_MESSAGE,
          });
        } else {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              createInvalidSourceError(source).message +
              "\n" +
              MISSING_PERMISSIONS_TO_EDIT_SERVER_MESSAGE,
          });
        }
      },
      permission_failure_message: MISSING_PERMISSIONS_TO_EDIT_SERVER_MESSAGE,
    });
    expect(successful_variants).toEqual([{ source: "discord-bot", permission: "AddReactions" }]);
  });
});
