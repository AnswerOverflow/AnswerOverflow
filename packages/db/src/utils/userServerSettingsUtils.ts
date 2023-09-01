import { UserServerSettings } from '../schema';
import { bitfieldToUserServerSettingsFlags } from '@answeroverflow/prisma-types';

export function addFlagsToUserServerSettings<
	T extends UserServerSettings & {
		bitfield: number;
	},
>(userServerSettings: T) {
	return {
		...userServerSettings,
		flags: bitfieldToUserServerSettingsFlags(userServerSettings.bitfield),
	};
}
