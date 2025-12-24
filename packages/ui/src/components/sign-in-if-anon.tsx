// import { useEffect, useRef, useState } from "react";
// import { useAuthClient } from "./convex-client-provider";

export function SignInIfAnon() {
	// const authClient = useAuthClient();
	// const auth = authClient.useSession();
	// const [isSigningIn, setIsSigningIn] = useState(false);
	// const hasAttemptedSignIn = useRef(false);

	// useEffect(() => {
	// 	if (
	// 		auth.isPending ||
	// 		auth.data ||
	// 		isSigningIn ||
	// 		hasAttemptedSignIn.current
	// 	) {
	// 		return;
	// 	}

	// 	hasAttemptedSignIn.current = true;
	// 	setIsSigningIn(true);
	// 	authClient.signIn.anonymous().finally(() => {
	// 		setIsSigningIn(false);
	// 	});
	// }, [auth.isPending, auth.data, isSigningIn, authClient]);

	return null;
}
