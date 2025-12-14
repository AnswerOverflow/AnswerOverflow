// instrumentation-client.ts
import { initBotId } from "botid/client/core";

initBotId({
	protect: [
		{
			path: "/api/auth/anonymous-session",
			method: "GET",
		},
	],
});
