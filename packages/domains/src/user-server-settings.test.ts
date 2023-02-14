import type { UserServerSettingsWithFlags } from "@answeroverflow/prisma-types";
import {
  ConsentSource,
  ManageAccountSource,
  updateUserConsent,
  updateUserServerIndexingPreference,
} from "./user-server-settings";
import type { UpdateSettingsError } from "./utils";
import {
  mockDiscordAccount,
  mockServer,
  mockUserServerSettingsWithFlags,
} from "@answeroverflow/db-mock";
import {
  createDiscordAccount,
  createServer,
  createUserServerSettings,
  findUserServerSettingsById,
  UserServerSettingsCreateWithDeps,
} from "@answeroverflow/db";
import type { PartialDeep } from "type-fest";

// These tests could benefit from being split up

export async function testUpdateUserServerSettings<S extends string>({
  sources,
  startingSettings,
  operation,
  validate,
}: {
  operation: (input: {
    source: S;
    startingSettings: UserServerSettingsCreateWithDeps;
    onError: (error: UpdateSettingsError) => void;
  }) => Promise<UserServerSettingsWithFlags | null>;
  validate: (input: {
    source: S;
    startingSettings: UserServerSettingsWithFlags | null;
    updated: UserServerSettingsWithFlags | null;
    updateSettingsError?: UpdateSettingsError;
  }) => void;
  sources: S[];
  startingSettings: PartialDeep<UserServerSettingsWithFlags> | null;
}) {
  for (const source of sources) {
    let updateSettingsError: UpdateSettingsError | undefined = undefined;
    const userSettings = mockUserServerSettingsWithFlags(startingSettings ?? {});
    const account = mockDiscordAccount({
      id: userSettings.userId,
    });
    const userSettingsWithUser = {
      ...userSettings,
      user: account,
    };
    const server = mockServer({
      id: userSettings.serverId,
    });
    await createServer(server);

    if (startingSettings) {
      await createDiscordAccount(account);
      await createUserServerSettings(userSettings);
    }
    const updated = await operation({
      source,
      startingSettings: userSettingsWithUser,
      onError(error) {
        updateSettingsError = error;
      },
    });
    if (!updateSettingsError) {
      const found = await findUserServerSettingsById({
        ...userSettings,
      });
      // Little bit of a sanity check
      expect(found).toEqual(updated);
    }
    validate({
      startingSettings: userSettingsWithUser,
      source,
      updated,
      updateSettingsError,
    });
  }
}

const automatedConsentSources: ConsentSource[] = ["forum-post-guidelines", "read-the-rules"];
const manualConsentSources: ConsentSource[] = [
  "manage-account-menu",
  "slash-command",
  "mark-solution-response",
];

describe("Consent", () => {
  describe("Update Consent Successes", () => {
    describe("Automated Consent Sources Successes", () => {
      test("user has never set their preferences", async () => {
        await testUpdateUserServerSettings({
          sources: automatedConsentSources,
          operation: async ({ startingSettings, source, onError }) => {
            return await updateUserConsent({
              updateData: {
                ...startingSettings,
                flags: {
                  canPubliclyDisplayMessages: true,
                },
              },
              source: source,
              onError,
            });
          },
          startingSettings: null,
          validate: ({ updated }) => {
            expect(updated?.flags.canPubliclyDisplayMessages).toBe(true);
          },
        });
      });
    });
    describe("Manual Consent Sources Successes", () => {
      test("user has never set their preferences", async () => {
        await testUpdateUserServerSettings({
          sources: manualConsentSources,
          operation: async ({ startingSettings, ...rest }) => {
            return await updateUserConsent({
              updateData: {
                ...startingSettings,
                flags: {
                  canPubliclyDisplayMessages: true,
                },
              },
              ...rest,
            });
          },
          startingSettings: null,
          validate: ({ updated }) => {
            expect(updated?.flags.canPubliclyDisplayMessages).toBe(true);
          },
        });
      });
      test("user has revoked consent and is trying to give consent", async () => {
        await testUpdateUserServerSettings({
          sources: manualConsentSources,
          operation: async ({ startingSettings, ...rest }) => {
            return await updateUserConsent({
              updateData: {
                ...startingSettings,
                flags: {
                  canPubliclyDisplayMessages: true,
                },
              },
              ...rest,
            });
          },
          startingSettings: {
            flags: {
              canPubliclyDisplayMessages: false,
            },
          },
          validate: ({ updated }) => {
            expect(updated?.flags.canPubliclyDisplayMessages).toBe(true);
          },
        });
      });
      test("user has given consent and is trying to revoke consent", async () => {
        await testUpdateUserServerSettings({
          sources: manualConsentSources,
          operation: async ({ startingSettings, ...rest }) => {
            return await updateUserConsent({
              updateData: {
                ...startingSettings,
                flags: {
                  canPubliclyDisplayMessages: false,
                },
              },
              ...rest,
            });
          },
          startingSettings: {
            flags: {
              canPubliclyDisplayMessages: true,
            },
          },
          validate: ({ updated }) => {
            expect(updated?.flags.canPubliclyDisplayMessages).toBe(false);
          },
        });
      });
    });
  });
  describe("Update Consent Failures", () => {
    describe("Automated Consent Sources Failures", () => {
      test("user has already provided consent for all automated consents and is trying to apply again", async () => {
        await testUpdateUserServerSettings({
          sources: automatedConsentSources,
          operation: async ({ startingSettings, ...rest }) => {
            return await updateUserConsent({
              updateData: {
                ...startingSettings,
                flags: {
                  canPubliclyDisplayMessages: true,
                },
              },
              ...rest,
            });
          },
          startingSettings: {
            flags: {
              canPubliclyDisplayMessages: true,
            },
          },
          validate: ({ updateSettingsError }) => {
            expect(updateSettingsError?.message).toBe(
              "Cannot set automatically as user has already explicitly set this setting"
            );
          },
        });
      });
      test("user has already revoked consent for all automated consents and is trying to revoke again", async () => {
        await testUpdateUserServerSettings({
          sources: automatedConsentSources,
          operation: async ({ startingSettings, ...rest }) => {
            return await updateUserConsent({
              updateData: {
                ...startingSettings,
                flags: {
                  canPubliclyDisplayMessages: false,
                },
              },
              ...rest,
            });
          },
          startingSettings: {
            flags: {
              canPubliclyDisplayMessages: false,
            },
          },
          validate: ({ updateSettingsError }) => {
            expect(updateSettingsError?.message).toBe(
              "Cannot set automatically as user has already explicitly set this setting"
            );
          },
        });
      });
    });
    describe("Manual Consent Sources Failures", () => {
      test("user has already given consent for all manual consents and is trying to give consent again", async () => {
        await testUpdateUserServerSettings({
          sources: manualConsentSources,
          operation: async ({ startingSettings, ...rest }) => {
            return await updateUserConsent({
              updateData: {
                ...startingSettings,
                flags: {
                  canPubliclyDisplayMessages: true,
                },
              },
              ...rest,
            });
          },
          startingSettings: {
            flags: {
              canPubliclyDisplayMessages: true,
            },
          },
          validate: ({ updateSettingsError }) => {
            expect(updateSettingsError?.message).toBe(
              "You have already granted consent to display your messages in this server"
            );
          },
        });
      });
      test("user has already revoked consent for all manual consents and is trying to revoke consent again", async () => {
        await testUpdateUserServerSettings({
          sources: manualConsentSources,
          operation: async ({ startingSettings, ...rest }) => {
            return await updateUserConsent({
              updateData: {
                ...startingSettings,
                flags: {
                  canPubliclyDisplayMessages: false,
                },
              },
              ...rest,
            });
          },
          startingSettings: {
            flags: {
              canPubliclyDisplayMessages: false,
            },
          },
          validate: ({ updateSettingsError }) => {
            expect(updateSettingsError?.message).toBe(
              "You have already revoked consent to display your messages in this server"
            );
          },
        });
      });
      test("user has disabled indexing and is trying to give consent", async () => {
        await testUpdateUserServerSettings({
          sources: manualConsentSources,
          operation: async ({ startingSettings, ...rest }) => {
            return await updateUserConsent({
              updateData: {
                ...startingSettings,
                flags: {
                  canPubliclyDisplayMessages: true,
                },
              },
              ...rest,
            });
          },
          startingSettings: {
            flags: {
              messageIndexingDisabled: true,
            },
          },
          validate: ({ updateSettingsError }) => {
            expect(updateSettingsError?.message).toBe(
              "You have disabled message indexing in this server. You cannot give consent to display your messages in this server until you enable message indexing"
            );
          },
        });
      });
    });
  });
});

const manageAccountSources: ManageAccountSource[] = ["manage-account-menu"];

describe("Manage Account", () => {
  it("should disable message indexing for a user", async () => {
    await testUpdateUserServerSettings({
      sources: manageAccountSources,
      operation: ({ startingSettings, ...rest }) => {
        return updateUserServerIndexingPreference({
          updateData: {
            ...startingSettings,
            flags: {
              messageIndexingDisabled: true,
            },
          },
          ...rest,
        });
      },
      startingSettings: null,
      validate: ({ updated }) => {
        expect(updated?.flags.messageIndexingDisabled).toBeTruthy();
      },
    });
  });
  it("should give the right error message when a user tries to disable message indexing when they have already disabled it", async () => {
    await testUpdateUserServerSettings({
      sources: manageAccountSources,
      operation: ({ startingSettings, ...rest }) => {
        return updateUserServerIndexingPreference({
          updateData: {
            ...startingSettings,
            flags: {
              messageIndexingDisabled: true,
            },
          },
          ...rest,
        });
      },
      startingSettings: {
        flags: {
          messageIndexingDisabled: true,
        },
      },
      validate: ({ updateSettingsError }) => {
        expect(updateSettingsError?.message).toBe(
          "You have already disabled message indexing in this server"
        );
      },
    });
  });
  it("should enable message indexing for a user", async () => {
    await testUpdateUserServerSettings({
      sources: manageAccountSources,
      operation: ({ startingSettings, ...rest }) => {
        return updateUserServerIndexingPreference({
          updateData: {
            ...startingSettings,
            flags: {
              messageIndexingDisabled: false,
            },
          },
          ...rest,
        });
      },
      startingSettings: {
        flags: {
          messageIndexingDisabled: true,
        },
      },
      validate: ({ updated }) => {
        expect(updated?.flags.messageIndexingDisabled).toBeFalsy();
      },
    });
  });
  it("should give the right error message when a user tries to enable message indexing when they have already enabled it", async () => {
    await testUpdateUserServerSettings({
      sources: manageAccountSources,
      operation: ({ startingSettings, ...rest }) => {
        return updateUserServerIndexingPreference({
          updateData: {
            ...startingSettings,
            flags: {
              messageIndexingDisabled: false,
            },
          },
          ...rest,
        });
      },
      startingSettings: {
        flags: {
          messageIndexingDisabled: false,
        },
      },
      validate: ({ updateSettingsError }) => {
        expect(updateSettingsError?.message).toBe(
          "You have already enabled message indexing in this server"
        );
      },
    });
  });
  it("should disable message indexing for a user and update their consent to no longer display messages", async () => {
    await testUpdateUserServerSettings({
      sources: manageAccountSources,
      operation: ({ startingSettings, ...rest }) => {
        return updateUserServerIndexingPreference({
          updateData: {
            ...startingSettings,
            flags: {
              messageIndexingDisabled: true,
            },
          },
          ...rest,
        });
      },
      startingSettings: {
        flags: {
          messageIndexingDisabled: false,
          canPubliclyDisplayMessages: true,
        },
      },
      validate: ({ updated }) => {
        expect(updated?.flags.messageIndexingDisabled).toBeTruthy();
        expect(updated?.flags.canPubliclyDisplayMessages).toBeFalsy();
      },
    });
  });
});
