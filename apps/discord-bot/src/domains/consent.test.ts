import { setupAnswerOverflowBot } from "~discord-bot/test/sapphire-mock";
import { toAODiscordAccount, toAOServer } from "~discord-bot/utils/conversions";
import {
  createDiscordAccount,
  createServer,
  createUserServerSettings,
  UserServerSettingsWithFlags,
} from "@answeroverflow/db";
import type { Client, GuildMember } from "discord.js";
import { mockGuildMember } from "@answeroverflow/discordjs-mock";
import { ConsentSource, updateUserConsent } from "./consent";
import type { UpdateSettingsError } from "./settings";
import type { PartialDeep } from "type-fest";

let client: Client;
const automatedConsentSources: ConsentSource[] = ["forum-post-guidelines", "read-the-rules"];
const manualConsentSources: ConsentSource[] = [
  "manage-account-menu",
  "slash-command",
  "mark-solution-response",
];
beforeEach(async () => {
  client = await setupAnswerOverflowBot();
});

async function testAllConsentSources<
  T extends Omit<PartialDeep<UserServerSettingsWithFlags>, "serverId" | "userId">
>({
  consentSources,
  startingSettings,
  isConsentBeingGranted,
  validate,
}: {
  validate: (input: {
    member: GuildMember;
    consentSource: ConsentSource;
    startingSettings: T | null;
    isConsentBeingGranted: boolean;
    updated: UserServerSettingsWithFlags | null;
    error?: UpdateSettingsError;
  }) => void;
  consentSources: ConsentSource[];
  isConsentBeingGranted: boolean;
  startingSettings: T | null;
}) {
  for (const consentSource of consentSources) {
    let consetError: UpdateSettingsError | undefined = undefined;
    const memberAlreadyConsenting = mockGuildMember({ client });
    await createServer(toAOServer(memberAlreadyConsenting.guild));
    await createDiscordAccount(toAODiscordAccount(memberAlreadyConsenting.user));
    if (startingSettings !== null) {
      await createUserServerSettings({
        serverId: memberAlreadyConsenting.guild.id,
        userId: memberAlreadyConsenting.id,
        ...startingSettings,
      });
    }
    const updated = await updateUserConsent({
      member: memberAlreadyConsenting,
      consentSource,
      onError: (error) => {
        consetError = error;
      },
      canPubliclyDisplayMessages: isConsentBeingGranted,
    });
    validate({
      member: memberAlreadyConsenting,
      startingSettings,
      isConsentBeingGranted,
      consentSource,
      updated,
      error: consetError,
    });
  }
}

describe("Consent", () => {
  describe("Update User Consent", () => {
    describe("Update Consent Successes", () => {
      describe("Automated Consent Sources Successes", () => {
        test("user has never set their preferences", async () => {
          await testAllConsentSources({
            consentSources: automatedConsentSources,
            startingSettings: null,
            isConsentBeingGranted: true,
            validate: ({ updated }) => {
              expect(updated?.flags.canPubliclyDisplayMessages).toBe(true);
            },
          });
        });
      });
      describe("Manual Consent Sources Successes", () => {
        test("user has never set their preferences", async () => {
          await testAllConsentSources({
            consentSources: manualConsentSources,
            startingSettings: null,
            isConsentBeingGranted: true,
            validate: ({ updated }) => {
              expect(updated?.flags.canPubliclyDisplayMessages).toBe(true);
            },
          });
        });
        test("user has revoked consent and is trying to give consent", async () => {
          await testAllConsentSources({
            consentSources: manualConsentSources,
            startingSettings: {
              flags: {
                canPubliclyDisplayMessages: false,
              },
            },
            isConsentBeingGranted: true,
            validate: ({ updated }) => {
              expect(updated?.flags.canPubliclyDisplayMessages).toBe(true);
            },
          });
        });
        test("user has given consent and is trying to revoke consent", async () => {
          await testAllConsentSources({
            consentSources: manualConsentSources,
            startingSettings: {
              flags: {
                canPubliclyDisplayMessages: true,
              },
            },
            isConsentBeingGranted: false,
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
          await testAllConsentSources({
            consentSources: automatedConsentSources,
            startingSettings: {
              flags: {
                canPubliclyDisplayMessages: true,
              },
            },
            isConsentBeingGranted: true,
            validate: ({ member, consentSource, error }) => {
              expect(error?.message).toBe(
                `Consent for ${member.user.id} in ${member.guild.id} for ${consentSource} is already set`
              );
            },
          });
        });
        test("user has already revoked consent for all automated consents and is trying to revoke again", async () => {
          await testAllConsentSources({
            consentSources: automatedConsentSources,
            startingSettings: {
              flags: {
                canPubliclyDisplayMessages: false,
              },
            },
            isConsentBeingGranted: true,
            validate: ({ member, consentSource, error }) => {
              expect(error?.message).toBe(
                `Consent for ${member.user.id} in ${member.guild.id} for ${consentSource} is already set`
              );
            },
          });
        });
      });
      describe("Manual Consent Sources Failures", () => {
        test("user has already given consent for all manual consents and is trying to give consent again", async () => {
          await testAllConsentSources({
            consentSources: manualConsentSources,
            startingSettings: {
              flags: {
                canPubliclyDisplayMessages: true,
              },
            },
            isConsentBeingGranted: true,
            validate: ({ member, error }) => {
              expect(error?.message).toBe(
                `You have already given consent for ${member.guild.name}`
              );
            },
          });
        });
        test("user has already revoked consent for all manual consents and is trying to revoke consent again", async () => {
          await testAllConsentSources({
            consentSources: manualConsentSources,
            startingSettings: {
              flags: {
                canPubliclyDisplayMessages: false,
                messageIndexingDisabled: true,
              },
            },
            isConsentBeingGranted: true,
            validate: ({ member, error }) => {
              expect(error?.message).toBe(
                `You have disabled indexing for ${member.guild.name}, if you wish to display your messages, first enable indexing`
              );
            },
          });
        });
        test("user has disabled inexing and is trying to give consent", async () => {});
      });
    });
  });
});
