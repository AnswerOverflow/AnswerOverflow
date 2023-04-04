import type {
	Guild,
	GuildMember,
	GuildTextBasedChannel,
	Interaction,
} from 'discord.js';

export async function guildTextChannelOnlyInteraction<T, I extends Interaction>(
	interaction: I,
	operation: ({
		guild,
		channel,
		member,
	}: {
		guild: Guild;
		channel: GuildTextBasedChannel;
		member: GuildMember;
	}) => Promise<T>,
) {
	if (interaction.guild == null) {
		return;
	}
	if (!interaction.channel || interaction.channel.isDMBased()) {
		return;
	}
	if (interaction.channel.isVoiceBased()) {
		return;
	}
	const guild = interaction.guild;
	const channel = interaction.channel;
	const member = await interaction.guild.members.fetch(interaction.user.id);
	await operation({
		guild,
		channel,
		member,
	});
}
