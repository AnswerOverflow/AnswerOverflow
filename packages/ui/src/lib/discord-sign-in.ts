"use client";

import { toast } from "sonner";
import type { AuthClient } from "../components/convex-client-provider";

export async function signInWithDiscord(
	authClient: AuthClient,
	callbackURL: string,
) {
	const result = await authClient.signIn.social({
		provider: "discord",
		callbackURL,
	});
	if (result.error) {
		toast.error(result.error.message);
		return;
	}
	const redirectURL = result.data?.url;
	if (redirectURL) {
		window.location.assign(redirectURL);
		return;
	}
	toast.error("Unable to start Discord sign in");
}
