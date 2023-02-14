it("should update user server settings", async () => {});
// import { setupAnswerOverflowBot } from "~discord-bot/test/sapphire-mock";
// import type { Client } from "discord.js";
// import { updateUserConsent } from "./consent";
// import { testUpdateUserServerSettings } from "~discord-bot/test/utils";

// let client: Client;
// const automatedConsentSources: ConsentSource[] = ["forum-post-guidelines", "read-the-rules"];
// const manualConsentSources: ConsentSource[] = [
//   "manage-account-menu",
//   "slash-command",
//   "mark-solution-response",
// ];
// beforeEach(async () => {
//   client = await setupAnswerOverflowBot();
// });

// describe("Consent", () => {
//   describe("Update User Consent", () => {
//     describe("Update Consent Successes", () => {
//       describe("Automated Consent Sources Successes", () => {
//         test("user has never set their preferences", async () => {
//           await testUpdateUserServerSettings({
//             sources: automatedConsentSources,
//             client,
//             operation: async ({ member, source, onError }) => {
//               return await updateUserConsent({
//                 member,
//                 canPubliclyDisplayMessages: true,
//                 consentSource: source,
//                 onError,
//               });
//             },
//             startingSettings: null,
//             validate: ({ updated }) => {
//               expect(updated?.flags.canPubliclyDisplayMessages).toBe(true);
//             },
//           });
//         });
//       });
//       describe("Manual Consent Sources Successes", () => {
//         test("user has never set their preferences", async () => {
//           await testUpdateUserServerSettings({
//             sources: manualConsentSources,
//             client,
//             operation: async ({ member, source, onError }) => {
//               return await updateUserConsent({
//                 member,
//                 canPubliclyDisplayMessages: true,
//                 consentSource: source,
//                 onError,
//               });
//             },
//             startingSettings: null,
//             validate: ({ updated }) => {
//               expect(updated?.flags.canPubliclyDisplayMessages).toBe(true);
//             },
//           });
//         });
//         test("user has revoked consent and is trying to give consent", async () => {
//           await testUpdateUserServerSettings({
//             sources: manualConsentSources,
//             client,
//             operation: async ({ member, source, onError }) => {
//               return await updateUserConsent({
//                 member,
//                 canPubliclyDisplayMessages: true,
//                 consentSource: source,
//                 onError,
//               });
//             },
//             startingSettings: {
//               flags: {
//                 canPubliclyDisplayMessages: false,
//               },
//             },
//             validate: ({ updated }) => {
//               expect(updated?.flags.canPubliclyDisplayMessages).toBe(true);
//             },
//           });
//         });
//         test("user has given consent and is trying to revoke consent", async () => {
//           await testUpdateUserServerSettings({
//             sources: automatedConsentSources,
//             client,
//             operation: async ({ member, source, onError }) => {
//               return await updateUserConsent({
//                 member,
//                 canPubliclyDisplayMessages: true,
//                 consentSource: source,
//                 onError,
//               });
//             },
//             startingSettings: null,
//             validate: ({ updated }) => {
//               expect(updated?.flags.canPubliclyDisplayMessages).toBe(true);
//             },
//           });
//         });
//       });
//     });
//     describe("Update Consent Failures", () => {
//       describe("Automated Consent Sources Failures", () => {
//         test("user has already provided consent for all automated consents and is trying to apply again", async () => {
//           await testUpdateUserServerSettings({
//             sources: automatedConsentSources,
//             client,
//             operation: async ({ member, source, onError }) => {
//               return await updateUserConsent({
//                 member,
//                 canPubliclyDisplayMessages: true,
//                 consentSource: source,
//                 onError,
//               });
//             },
//             startingSettings: {
//               flags: {
//                 canPubliclyDisplayMessages: true,
//               },
//             },
//             validate: ({ member, source, updateSettingsError }) => {
//               expect(updateSettingsError?.message).toBe(
//                 `Consent for ${member.user.id} in ${member.guild.id} for ${source} is already set`
//               );
//             },
//           });
//         });
//         test("user has already revoked consent for all automated consents and is trying to revoke again", async () => {
//           await testUpdateUserServerSettings({
//             sources: automatedConsentSources,
//             client,
//             operation: async ({ member, source, onError }) => {
//               return await updateUserConsent({
//                 member,
//                 canPubliclyDisplayMessages: false,
//                 consentSource: source,
//                 onError,
//               });
//             },
//             startingSettings: {
//               flags: {
//                 canPubliclyDisplayMessages: false,
//               },
//             },
//             validate: ({ member, source, updateSettingsError }) => {
//               expect(updateSettingsError?.message).toBe(
//                 `Consent for ${member.user.id} in ${member.guild.id} for ${source} is already set`
//               );
//             },
//           });
//         });
//       });
//       describe("Manual Consent Sources Failures", () => {
//         test("user has already given consent for all manual consents and is trying to give consent again", async () => {
//           await testUpdateUserServerSettings({
//             sources: manualConsentSources,
//             client,
//             operation: async ({ member, source, onError }) => {
//               return await updateUserConsent({
//                 member,
//                 canPubliclyDisplayMessages: true,
//                 consentSource: source,
//                 onError,
//               });
//             },
//             startingSettings: {
//               flags: {
//                 canPubliclyDisplayMessages: true,
//               },
//             },
//             validate: ({ member, updateSettingsError }) => {
//               expect(updateSettingsError?.message).toBe(
//                 `You have already given consent for ${member.guild.name}`
//               );
//             },
//           });
//         });
//         test("user has already revoked consent for all manual consents and is trying to revoke consent again", async () => {
//           await testUpdateUserServerSettings({
//             sources: manualConsentSources,
//             client,
//             operation: async ({ member, source, onError }) => {
//               return await updateUserConsent({
//                 member,
//                 canPubliclyDisplayMessages: false,
//                 consentSource: source,
//                 onError,
//               });
//             },
//             startingSettings: {
//               flags: {
//                 canPubliclyDisplayMessages: false,
//               },
//             },
//             validate: ({ member, updateSettingsError }) => {
//               expect(updateSettingsError?.message).toBe(
//                 `You have already denied consent for ${member.guild.name}`
//               );
//             },
//           });
//         });
//         test("user has disabled indexing and is trying to give consent", async () => {
//           await testUpdateUserServerSettings({
//             sources: manualConsentSources,
//             client,
//             operation: async ({ member, source, onError }) => {
//               return await updateUserConsent({
//                 member,
//                 canPubliclyDisplayMessages: true,
//                 consentSource: source,
//                 onError,
//               });
//             },
//             startingSettings: {
//               flags: {
//                 canPubliclyDisplayMessages: false,
//                 messageIndexingDisabled: true,
//               },
//             },
//             validate: ({ member, updateSettingsError }) => {
//               expect(updateSettingsError?.message).toBe(
//                 `You have disabled indexing for ${member.guild.name}, if you wish to display your messages, first enable indexing`
//               );
//             },
//           });
//         });
//       });
//     });
//   });
// });

// import type { Client } from "discord.js";
// import { setupAnswerOverflowBot } from "~discord-bot/test/sapphire-mock";
// import { testUpdateUserServerSettings } from "~discord-bot/test/utils";
// import { updateUserServerIndexingEnabled } from "./manage-account";

// const sources = ["manage-account-menu"];

// let client: Client;
// beforeEach(async () => {
//   client = await setupAnswerOverflowBot();
// });

// describe("Manage Account", () => {
//   it("should disable message indexing for a user", async () => {
//     await testUpdateUserServerSettings({
//       client,
//       operation: (data) => {
//         return updateUserServerIndexingEnabled({
//           ...data,
//           messageIndexingDisabled: true,
//         });
//       },
//       sources,
//       startingSettings: null,
//       validate: ({ updated }) => {
//         expect(updated?.flags.messageIndexingDisabled).toBe(true);
//       },
//     });
//   });
//   it("should enable message indexing for a user", async () => {
//     await testUpdateUserServerSettings({
//       client,
//       operation: (data) => {
//         return updateUserServerIndexingEnabled({
//           ...data,
//           messageIndexingDisabled: false,
//         });
//       },
//       sources,
//       startingSettings: {
//         flags: {
//           messageIndexingDisabled: true,
//         },
//       },
//       validate: ({ updated }) => {
//         expect(updated?.flags.messageIndexingDisabled).toBe(false);
//       },
//     });
//   });
//   it("should disable message indexing for a user and update their consent to no longer display messages", async () => {
//     await testUpdateUserServerSettings({
//       client,
//       operation: (data) => {
//         return updateUserServerIndexingEnabled({
//           ...data,
//           messageIndexingDisabled: true,
//         });
//       },
//       sources,
//       startingSettings: {
//         flags: {
//           canPubliclyDisplayMessages: true,
//         },
//       },
//       validate: ({ updated }) => {
//         expect(updated?.flags.messageIndexingDisabled).toBe(true);
//         expect(updated?.flags.canPubliclyDisplayMessages).toBe(false);
//       },
//     });
//   });
// });
