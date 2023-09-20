import { Channel } from '../schema';
import { addFlagsToChannel } from '../zodSchemas/channelSchemas';

export function getDefaultChannelWithFlags(
	override: Partial<Channel> &
		Pick<Channel, 'id' | 'serverId' | 'type' | 'parentId' | 'name'>,
) {
	return addFlagsToChannel(getDefaultChannel(override));
}

export function getDefaultChannel(
	override: Partial<Channel> &
		Pick<Channel, 'id' | 'name' | 'serverId' | 'parentId' | 'type'>,
): Channel {
	const data: Channel = {
		bitfield: 0,
		inviteCode: null,
		archivedTimestamp: null,
		solutionTagId: null,
		lastIndexedSnowflake: null,
		...override,
	};
	return data;
}
