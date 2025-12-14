#!/usr/bin/env bun

/**
 * Sync script to fetch the latest Discord OpenAPI specification
 * from Discord's official GitHub repository and update the local open-api.json file.
 *
 * This script also patches the GuildFeatures schema to accept any string value,
 * not just the enum values, to handle Discord API returning features that aren't
 * yet documented in their OpenAPI spec (e.g., AUDIO_BITRATE_384_KBPS).
 */

const DISCORD_OPENAPI_URL =
	"https://raw.githubusercontent.com/discord/discord-api-spec/main/specs/openapi.json";
const OUTPUT_FILE = "./open-api.json";

// biome-ignore lint/suspicious/noExplicitAny: i dont wanna fix this and not used at runtime
function patchGuildFeatures(spec: any): void {
	// Make GuildFeatures accept any string instead of strict enum
	// This allows Discord API to return features not yet in their spec
	const guildFeatures = spec.components?.schemas?.GuildFeatures;
	if (guildFeatures?.oneOf) {
		// Change from strict enum to plain string type that accepts any value
		// This ensures the generator creates S.String instead of a strict union
		spec.components.schemas.GuildFeatures = {
			type: "string",
			description:
				"Guild feature flags. May include values not yet documented in the OpenAPI spec.",
		};
		console.log("✅ Patched GuildFeatures to accept any string value");
	}
}

async function syncOpenApiSpec() {
	console.log(`Fetching Discord OpenAPI spec from ${DISCORD_OPENAPI_URL}...`);

	try {
		const response = await fetch(DISCORD_OPENAPI_URL);
		if (!response.ok) {
			throw new Error(
				`Failed to fetch OpenAPI spec: ${response.status} ${response.statusText}`,
			);
		}

		const spec = await response.json();

		// Patch GuildFeatures to be more permissive
		patchGuildFeatures(spec);

		const specString = JSON.stringify(spec, null, 2);

		await Bun.write(OUTPUT_FILE, specString);

		console.log(`✅ Successfully updated ${OUTPUT_FILE}`);
		console.log(
			`📝 Next step: Run 'bun run gen' to regenerate the TypeScript types`,
		);
	} catch (error) {
		console.error("❌ Error syncing OpenAPI spec:", error);
		process.exit(1);
	}
}

syncOpenApiSpec();
