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
import { ConsentError, ConsentSource, updateUserConsent } from "./consent";

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

async function testAllConsentSources({
  consentSources,
  canPubliclyDisplayMessages,
  isConsentBeingGranted,
  validate,
}: {
  validate: (input: {
    member: GuildMember;
    consentSource: ConsentSource;
    canPubliclyDisplayMessages: boolean | null;
    isConsentBeingGranted: boolean;
    updated: UserServerSettingsWithFlags | null;
    error?: ConsentError;
  }) => void;
  consentSources: ConsentSource[];
  isConsentBeingGranted: boolean;
  canPubliclyDisplayMessages: boolean | null;
}) {
  for (const consentSource of consentSources) {
    let consetError: ConsentError | undefined = undefined;
    const memberAlreadyConsenting = mockGuildMember({ client });
    await createServer(toAOServer(memberAlreadyConsenting.guild));
    await createDiscordAccount(toAODiscordAccount(memberAlreadyConsenting.user));
    if (canPubliclyDisplayMessages !== null) {
      await createUserServerSettings({
        serverId: memberAlreadyConsenting.guild.id,
        userId: memberAlreadyConsenting.id,
        flags: {
          canPubliclyDisplayMessages,
        },
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
      canPubliclyDisplayMessages,
      isConsentBeingGranted,
      consentSource,
      updated,
      error: consetError,
    });
  }
}

describe("Consent", () => {
  /*
    We need to validate 2 things:
      1. Successfully updating the users consent
        - Automated consent:
          - User has never set their preferences
        - Manual consent:
          - User has never set their preferences
          - User has revoked consent and is trying to give consent
          - User has given consent and is trying to revoke consent
      2. For each variant, the correct error is thrown
        - Automated consent:
          - User has already given consent
          - User has already revoked consent
        - Manual consent:
          - User has already given consent and is trying to give consent again
          - User has already revoked consent and is trying to revoke consent again

  */
  describe("Update User Consent", () => {
    describe("Update Consent Successes", () => {
      describe("Automated Consent Sources Successes", () => {
        test("user has never set their preferences", async () => {
          await testAllConsentSources({
            consentSources: automatedConsentSources,
            canPubliclyDisplayMessages: null,
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
            canPubliclyDisplayMessages: null,
            isConsentBeingGranted: true,
            validate: ({ updated }) => {
              expect(updated?.flags.canPubliclyDisplayMessages).toBe(true);
            },
          });
        });
        test("user has revoked consent and is trying to give consent", async () => {
          await testAllConsentSources({
            consentSources: manualConsentSources,
            canPubliclyDisplayMessages: false,
            isConsentBeingGranted: true,
            validate: ({ updated }) => {
              expect(updated?.flags.canPubliclyDisplayMessages).toBe(true);
            },
          });
        });
        test("user has given consent and is trying to revoke consent", async () => {
          await testAllConsentSources({
            consentSources: manualConsentSources,
            canPubliclyDisplayMessages: true,
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
            canPubliclyDisplayMessages: true,
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
            canPubliclyDisplayMessages: false,
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
            canPubliclyDisplayMessages: true,
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
            canPubliclyDisplayMessages: false,
            isConsentBeingGranted: false,
            validate: ({ member, error }) => {
              expect(error?.message).toBe(
                `You have already denied consent for ${member.guild.name}`
              );
            },
          });
        });
      });
    });
  });
});
