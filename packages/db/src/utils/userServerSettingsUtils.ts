import { UserServerSettings } from '../schema';
import { bitfieldToDict, dictToBitfield, mergeFlags } from './bitfieldUtils';

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

export type UserServerSettingsWithFlags = Awaited<
	ReturnType<typeof addFlagsToUserServerSettings>
>;

export const userServerSettingsFlags = [
	'canPubliclyDisplayMessages',
	'messageIndexingDisabled',
] as const;

export const bitfieldToUserServerSettingsFlags = (bitfield: number) =>
	bitfieldToDict(bitfield, userServerSettingsFlags);

export function userServerSettingsFlagsToBitfield(
	old: number,
	newFlags: Record<string, boolean>,
) {
	return mergeFlags(
		() => bitfieldToUserServerSettingsFlags(old),
		newFlags,
		(flags) => dictToBitfield(flags, userServerSettingsFlags),
	);
}
