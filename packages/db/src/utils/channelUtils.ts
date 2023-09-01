import {
	addFlagsToChannel,
	getDefaultChannel,
} from '@answeroverflow/prisma-types';
import { Channel } from '../schema';

export function getDefaultChannelWithFlags(
	override: Partial<Channel> &
		Pick<Channel, 'id' | 'serverId' | 'type' | 'parentId' | 'name'>,
) {
	return addFlagsToChannel(getDefaultChannel(override));
}
