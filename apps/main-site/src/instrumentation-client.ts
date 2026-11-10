import { initBotId } from "botid/client/core";

initBotId({
	protect: [
		{
			path: "/api/auth/anonymous-session",
			method: "GET",
		},
		{
			path: "/api/auth/sign-in/anonymous",
			method: "POST",
		},
	],
});
