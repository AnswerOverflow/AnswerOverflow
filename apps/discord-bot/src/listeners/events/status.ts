import { ApplyOptions } from '@sapphire/decorators';
import { Listener, SapphireClient } from '@sapphire/framework';
import { ActivityOptions, ActivityType, Events } from 'discord.js';
import { getTotalNumberOfMessages } from '@answeroverflow/db';
import { hoursToMs } from '~discord-bot/utils/utils';

const timeBetweenStatusChangesInHours = process.env
	.STATUS_UPDATE_INTERVAL_IN_HOURS
	? parseFloat(process.env.STATUS_UPDATE_INTERVAL_IN_HOURS)
	: 1;

type StatusUpdate = {
	getStatus: (() => Promise<string> | string) | string;
} & ActivityOptions;

function getStatuses(client: SapphireClient) {
	const statuses: StatusUpdate[] = [
		{
			type: ActivityType.Watching,
			getStatus: () =>
				`${client.guilds.cache.size.toLocaleString()} communities!`,
		},
		{
			type: ActivityType.Listening,
			async getStatus() {
				const numMessages = await getTotalNumberOfMessages();
				return `${numMessages.toLocaleString()} messages`;
			},
		},
		{
			type: ActivityType.Watching,
			getStatus: 'Open source! github.com/AnswerOverflow',
		},
		{
			type: ActivityType.Listening,
			getStatus: () => {
				const totalMemberCount = client.guilds.cache.reduce(
					(total, guild) => total + guild.memberCount,
					0,
				);
				return `${totalMemberCount.toLocaleString()} users asking questions!`;
			},
		},
		{
			type: ActivityType.Watching,
			getStatus: () => `help channels index into Google`,
		},
	];
	return statuses;
}

@ApplyOptions<Listener.Options>({ event: Events.ClientReady })
export class LoopStatus extends Listener {
	public run() {
		let statusIndex = 0;
		// eslint-disable-next-line @typescript-eslint/no-misused-promises
		setInterval(async () => {
			const statuses = getStatuses(this.container.client);
			const status = statuses[statusIndex++];
			if (!status) {
				this.container.logger.error('No status found for index ', statusIndex);
				return;
			}
			if (statusIndex >= statuses.length) {
				statusIndex = 0; // instead of using modulo, we just reset the index to avoid overflow
			}
			const statusText =
				typeof status.getStatus === 'string'
					? status.getStatus
					: await status.getStatus();
			this.container.client.user?.setActivity(statusText, {
				type: status.type,
			});
			this.container.logger.debug('Setting status to ' + statusText);
		}, hoursToMs(timeBetweenStatusChangesInHours));
	}
}
