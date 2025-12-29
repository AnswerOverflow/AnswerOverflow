import {
	createOpencodeClient,
	createOpencodeServer,
	type OpencodeClient,
} from "@opencode-ai/sdk";
import { Context, Effect, Layer } from "effect";

export class OpenCode extends Context.Tag("OpenCode")<
	OpenCode,
	{
		client: OpencodeClient;
		serverUrl: string;
	}
>() {}

import path from "node:path";

const OPENCODE_PORT = Number(process.env.OPENCODE_PORT) || 21212;
const OPENCODE_DIRECTORY =
	process.env.OPENCODE_DIRECTORY || "/root/.localcode/repo";

async function checkServerRunning(url: string): Promise<boolean> {
	try {
		const response = await fetch(`${url}/health`, {
			method: "GET",
			signal: AbortSignal.timeout(2000),
		});
		return response.ok;
	} catch {
		return false;
	}
}

export const OpenCodeLive = Layer.scoped(
	OpenCode,
	Effect.gen(function* () {
		const serverUrl = `http://127.0.0.1:${OPENCODE_PORT}`;

		const alreadyRunning = yield* Effect.tryPromise({
			try: () => checkServerRunning(serverUrl),
			catch: () => false,
		});

		let closeServer: (() => void) | null = null;

		if (alreadyRunning) {
			console.log(
				`OpenCode server already running at ${serverUrl} (directory: ${OPENCODE_DIRECTORY})`,
			);
		} else {
			const server = yield* Effect.tryPromise({
				try: () =>
					createOpencodeServer({
						port: OPENCODE_PORT,
						timeout: 30000,
					}),
				catch: (e) => new Error(`Failed to start OpenCode server: ${e}`),
			});
			closeServer = server.close;
			console.log(
				`OpenCode server started at ${server.url} (directory: ${OPENCODE_DIRECTORY})`,
			);
		}

		const client = createOpencodeClient({
			baseUrl: serverUrl,
			directory: OPENCODE_DIRECTORY,
		});

		yield* Effect.addFinalizer(() =>
			Effect.sync(() => {
				if (closeServer) {
					console.log("Shutting down OpenCode server...");
					closeServer();
				}
			}),
		);

		return {
			client,
			serverUrl,
		};
	}),
);
