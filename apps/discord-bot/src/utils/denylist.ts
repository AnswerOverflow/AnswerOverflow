import type { Guild } from "discord.js";
import { Console, Effect } from "effect";

export const DENYLIST = {
	SERVER_IDS: new Set([
		"1133324597534654484",
		"1133132039466528818",
		"1154298795182526484",
		"1395122494486085715",
		"1406148988029239376",
		"1408850226222993540",
		"1411063108855922691",
	]),
	USER_IDS: new Set([
		"1073171830216589352",
		"1405204138203283527",
		"825434035076464710",
		"684918626192851032",
	]),
} as const;

export function leaveServerIfNecessary(guild: Guild) {
	return Effect.gen(function* () {
		const isServerInDenylist = DENYLIST.SERVER_IDS.has(guild.id);
		const isServerOwnerInDenylist = DENYLIST.USER_IDS.has(guild.ownerId);
		const doesNameHaveGrowAGarden = guild.name
			.toLowerCase()
			.includes("grow a garden");

		if (
			isServerInDenylist ||
			isServerOwnerInDenylist ||
			doesNameHaveGrowAGarden
		) {
			yield* Effect.promise(() => guild.leave());
			yield* Console.log(
				`Left server ${guild.name} (${guild.id}) because the ${
					isServerInDenylist ? "server" : "owner"
				} is in the denylist`,
			);
			return true;
		}
		return false;
	});
}
