import { useEffect, useRef } from "react";
import { authClient } from "./convex-client-provider";

export function SignInIfAnon() {
	const auth = authClient.useSession();
	const signInAttempted = useRef(false);

	useEffect(() => {
		if (auth.isPending || auth.data || signInAttempted.current) {
			return;
		}

		signInAttempted.current = true;
	}, [auth.isPending, auth.data]);

	return null;
}
