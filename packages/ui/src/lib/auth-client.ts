import {
	convexClient,
	crossDomainClient,
} from "@convex-dev/better-auth/client/plugins";
import {
	adminClient,
	anonymousClient,
	apiKeyClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { toast } from "sonner";

/** Creates an auth client that reports failed social sign-in requests to the user. */
export function createAuthClientInstance(baseURL: string | undefined) {
	return createAuthClient({
		baseURL,
		fetchOptions: {
			onError: ({ request, error }) => {
				if (new URL(request.url).pathname !== "/api/auth/sign-in/social") {
					return;
				}
				toast.error("Sign-in could not start", {
					id: "sign-in-error",
					description:
						error.status === 429
							? "Sign-in is temporarily limited. Wait a minute and try again."
							: "Try signing in again. If it still fails, contact support.",
					action: {
						label: "Get help",
						onClick: () => {
							window.location.assign("https://discord.answeroverflow.com");
						},
					},
				});
			},
		},
		plugins: [
			anonymousClient(),
			convexClient(),
			crossDomainClient(),
			adminClient(),
			apiKeyClient(),
		],
	});
}
