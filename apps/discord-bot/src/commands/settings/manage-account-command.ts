import { ApplyOptions } from "@sapphire/decorators";
import { type ChatInputCommand, Command } from "@sapphire/framework";

import { getDefaultUserServerSettingsWithFlags } from "@answeroverflow/core/utils/serverUtils";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ChatInputCommandInteraction,
  ComponentType,
  EmbedBuilder,
  MessageActionRowComponentBuilder,
  SlashCommandBuilder,
} from "discord.js";
import { guildTextChannelOnlyInteraction } from "../../utils/conditions";
import { createMemberCtx } from "../../utils/context";
import {
  callAPI,
  callWithAllowedErrors,
  oneTimeStatusHandler,
} from "../../utils/trpc";
import { getCommandIds } from "../../utils/utils";
import {
  updateUserConsent,
  updateUserServerIndexingEnabled,
} from "../../domains/manage-account";

const menuButtonIds = {
  consentButton: "consent-button",
  revokeConsentButton: "revoke-consent-button",
  enableMessageIndexingButton: "enable-message-indexing-button",
  disableMessageIndexingButton: "disable-message-indexing-button",
  ignoreGloballyButton: "ignore-globally-button",
  unignoreGloballyButton: "unignore-globally-button",
} as const;
@ApplyOptions<Command.Options>({
  name: "manage-account",
  description: "Manage how Answer Overflow interacts with your account",
  runIn: ["GUILD_ANY"],
})
export class OpenManageAccountMenuCommand extends Command {
  public override registerApplicationCommands(
    registry: ChatInputCommand.Registry
  ) {
    const ids = getCommandIds({
      local: "1073363501659201646",
      staging: "1081235691649904741",
      production: "1013627262068859000",
    });
    registry.registerChatInputCommand(
      new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description)
        .setDMPermission(false),
      {
        idHints: ids,
      }
    );
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    await guildTextChannelOnlyInteraction(
      interaction,
      async ({ guild, member }) => {
        await callAPI({
          async apiCall(router) {
            const userServerSettingsFetch = callWithAllowedErrors({
              call: () => router.userServerSettings.byId(guild.id),
              allowedErrors: "NOT_FOUND",
            });
            const isIgnoredAccountFetch = router.discordAccounts.checkIfIgnored(
              member.id
            );
            const [userServerSettings, isIgnoredAccount] = await Promise.all([
              userServerSettingsFetch,
              isIgnoredAccountFetch,
            ]);
            return {
              userServerSettings,
              isIgnoredAccount,
            };
          },
          async Ok({ userServerSettings, isIgnoredAccount }) {
            if (!userServerSettings) {
              userServerSettings = getDefaultUserServerSettingsWithFlags({
                userId: interaction.user.id,
                serverId: guild.id,
              });
            }
            const actionRow =
              new ActionRowBuilder<MessageActionRowComponentBuilder>();
            const embed = new EmbedBuilder()
              .setTitle("Manage your account settings")
              .setDescription(
                "Here, you can manage how Answer Overflow interacts with your account."
              );
            if (isIgnoredAccount) {
              embed.setDescription(
                "Your account is currently being ignored globally. You can stop ignoring it by clicking the button below."
              );
              actionRow.addComponents(
                new ButtonBuilder()
                  .setCustomId(menuButtonIds.unignoreGloballyButton)
                  .setLabel("Stop ignoring globally")
                  .setStyle(ButtonStyle.Success)
              );
            } else {
              if (userServerSettings.flags.canPubliclyDisplayMessages) {
                actionRow.addComponents(
                  new ButtonBuilder()
                    .setCustomId(menuButtonIds.revokeConsentButton)
                    .setLabel("Disable showing my messages on Answer Overflow")
                    .setStyle(ButtonStyle.Danger)
                );
              } else {
                actionRow.addComponents(
                  new ButtonBuilder()
                    .setCustomId(menuButtonIds.consentButton)
                    .setLabel("Publicly display my messages on Answer Overflow")
                    .setStyle(ButtonStyle.Success)
                );
              }
              if (userServerSettings.flags.messageIndexingDisabled) {
                actionRow.addComponents(
                  new ButtonBuilder()
                    .setCustomId(menuButtonIds.enableMessageIndexingButton)
                    .setLabel("Enable indexing my messages")
                    .setStyle(ButtonStyle.Success)
                );
              } else {
                actionRow.addComponents(
                  new ButtonBuilder()
                    .setCustomId(menuButtonIds.disableMessageIndexingButton)
                    .setLabel("Disable indexing my messages")
                    .setStyle(ButtonStyle.Danger)
                );
              }
              actionRow.addComponents(
                new ButtonBuilder()
                  .setCustomId(menuButtonIds.ignoreGloballyButton)
                  .setLabel("Ignore globally")
                  .setStyle(ButtonStyle.Danger)
              );
            }

            const reply = await interaction.reply({
              embeds: [embed],
              components: [actionRow],
              ephemeral: true,
            });
            const followup = await reply.awaitMessageComponent({
              componentType: ComponentType.Button,
              time: 5 * 60 * 1000,
              filter: (i) =>
                i.user.id === interaction.user.id &&
                Object.values(menuButtonIds).includes(i.customId),
            });
            const customId =
              followup.customId as (typeof menuButtonIds)[keyof typeof menuButtonIds];
            switch (customId) {
              case menuButtonIds.consentButton: {
                await updateUserConsent({
                  member,
                  consentSource: "manage-account-menu",
                  canPubliclyDisplayMessages: true,
                });
                break;
              }
              case menuButtonIds.revokeConsentButton: {
                await updateUserConsent({
                  member,
                  consentSource: "manage-account-menu",
                  canPubliclyDisplayMessages: false,
                });
                break;
              }
              case menuButtonIds.enableMessageIndexingButton: {
                await updateUserServerIndexingEnabled({
                  member,
                  messageIndexingDisabled: false,
                  source: "manage-account-menu",
                });
                break;
              }
              case menuButtonIds.disableMessageIndexingButton: {
                await updateUserServerIndexingEnabled({
                  member,
                  messageIndexingDisabled: true,
                  source: "manage-account-menu",
                });
                break;
              }
              case menuButtonIds.ignoreGloballyButton: {
                await callAPI({
                  apiCall: (router) =>
                    router.discordAccounts.delete(interaction.user.id),
                  getCtx: () => createMemberCtx(member),
                  Error: (error) =>
                    oneTimeStatusHandler(interaction, error.message),
                  Ok: () => {},
                });
                break;
              }
              case menuButtonIds.unignoreGloballyButton: {
                await callAPI({
                  apiCall: (router) =>
                    router.discordAccounts.undelete(interaction.user.id),
                  getCtx: () => createMemberCtx(member),
                  Error: (error) =>
                    oneTimeStatusHandler(interaction, error.message),
                  Ok: () => {},
                });
                break;
              }
            }
          },
          Error: (error) => oneTimeStatusHandler(interaction, error.message),
          getCtx: () => createMemberCtx(member),
        });
      }
    );
  }
}
