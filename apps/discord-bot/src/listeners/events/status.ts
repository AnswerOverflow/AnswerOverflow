import { ApplyOptions } from '@sapphire/decorators';
import { Listener, SapphireClient } from '@sapphire/framework';
import { ActivityOptions, ActivityType, Events } from 'discord.js';
import { elastic } from '@answeroverflow/elastic-types';

const timeBetweenSwitchesInMilliseconds = 1000 * 60 * 60;

type StatusUpdate = {
	getStatus: (() => Promise<string> | string) | string;
} & ActivityOptions;

function getStatuses(client: SapphireClient) {
	const statuses: StatusUpdate[] = [
		{
			type: ActivityType.Watching,
			getStatus: () => `${client.guilds.cache.size} communities.`,
		},
		{
			type: ActivityType.Listening,
			async getStatus() {
				const numMessages = await elastic.getNumberOfIndexedMessages();
				return ` to ${numMessages} messages`;
			},
		},
    {
			type: ActivityType.Playing,
			getStatus: 'Open Source! github.com/AnswerOverflow',
		},
		{
			type: ActivityType.Listening,
			getStatus: () => {
				let approximateTotalMemberCount = 0;
				for (const guild of client.guilds.cache.values()) {
					approximateTotalMemberCount += guild.approximateMemberCount ?? 0;
				}

				return `${approximateTotalMemberCount} users asking questions.`;
			},
		},
		{
			type: ActivityType.Playing,
			getStatus: 'Placeholder5',
		},
		{
			type: ActivityType.Playing,
			getStatus: 'Placeholder6',
		},
	];
	return statuses;
}

@ApplyOptions<Listener.Options>({ event: Events.ClientReady })
export class LoopStatus extends Listener {
	public run() {
		// eslint-disable-next-line @typescript-eslint/no-misused-promises
		setInterval(async () => {
			const statuses = getStatuses(this.container.client);
			const index = Math.floor(
				((new Date().getHours() % 6) / 6) * statuses.length,
			);
			const status = statuses[index]!;
			const statusText =
				typeof status.getStatus === 'string'
					? status.getStatus
					: await status.getStatus();
			this.container.client.user?.setActivity(statusText, {
				type: status.type,
			});
			this.container.logger.debug('Setting status to ' + statusText);
		}, timeBetweenSwitchesInMilliseconds);
	}
}
