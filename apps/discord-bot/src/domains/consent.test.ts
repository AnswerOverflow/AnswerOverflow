import { setupAnswerOverflowBot } from "~discord-bot/test/sapphire-mock";
import { toAODiscordAccount, toAOServer } from "~discord-bot/utils/conversions";
import { createDiscordAccount, createServer, createUserServerSettings } from "@answeroverflow/db";
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
    canPubliclyDisplayMessages: boolean;
    isConsentBeingGranted: boolean;
    error?: ConsentError;
  }) => void;
  consentSources: ConsentSource[];
  isConsentBeingGranted: boolean;
  canPubliclyDisplayMessages: boolean;
}) {
  for (const consentSource of consentSources) {
    let consetError: ConsentError | undefined = undefined;
    const memberAlreadyConsenting = mockGuildMember({ client });
    await createServer(toAOServer(memberAlreadyConsenting.guild));
    await createDiscordAccount(toAODiscordAccount(memberAlreadyConsenting.user));
    await createUserServerSettings({
      serverId: memberAlreadyConsenting.guild.id,
      userId: memberAlreadyConsenting.id,
      flags: {
        canPubliclyDisplayMessages,
      },
    });
    await updateUserConsent({
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
      error: consetError,
    });
  }
}

describe("Consent", () => {
  /*
    We need to validate 2 things:
      1. Successfully updating the users consent
      2. For each variant, the correct error is thrown
  */
  describe("Update User Consent", () => {
    describe("Automated Consent Sources", () => {
      it("should validate the correct error when the user has provided consent for all automated consents", async () => {
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
      it("should validate the correct error when the user has revoked consent for all automated consents", async () => {
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
    describe("Manual Consent Sources", () => {
      it("should validate the correct error when the user has provided consent for all manual consents", async () => {
        await testAllConsentSources({
          consentSources: manualConsentSources,
          canPubliclyDisplayMessages: true,
          isConsentBeingGranted: true,
          validate: ({ member, error }) => {
            expect(error?.message).toBe(`You have already given consent for ${member.guild.name}`);
          },
        });
      });
      it("should validate the correct error when the user has revoked consent for all manual consents", async () => {
        await testAllConsentSources({
          consentSources: manualConsentSources,
          canPubliclyDisplayMessages: false,
          isConsentBeingGranted: false,
          validate: ({ member, error }) => {
            expect(error?.message).toBe(`You have already denied consent for ${member.guild.name}`);
          },
        });
      });
    });
  });
});
