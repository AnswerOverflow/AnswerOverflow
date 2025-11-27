import { useEffect, useRef, useState } from "react";
import { authClient } from "./convex-client-provider";

export function SignInIfAnon() {
	const auth = authClient.useSession();
	const [isSigningIn, setIsSigningIn] = useState(false);
	const hasAttemptedSignIn = useRef(false);

	useEffect(() => {
		if (
			!auth.isPending &&
			!auth.data &&
			!isSigningIn &&
			!hasAttemptedSignIn.current
		) {
			console.log("signing in anonymously");
			setIsSigningIn(true);
			authClient.signIn.anonymous().then((sess) => {
				setIsSigningIn(false);
				console.log("session", sess);
			});
		}
	}, [auth.isPending, auth.data, isSigningIn, auth.refetch]);

	return null;
}
