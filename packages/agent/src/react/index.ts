"use client";
import { useMemo, useState } from "react";
export { toUIMessages, type UIMessage } from "../UIMessages";

export { optimisticallySendMessage } from "./optimisticallySendMessage";
export { useSmoothText } from "./useSmoothText";
export { SmoothText } from "./SmoothText";
export {
	type ThreadMessagesQuery,
	useThreadMessages,
	useStreamingThreadMessages,
} from "./useThreadMessages";
export { type UIMessagesQuery, useUIMessages } from "./useUIMessages";
export { useStreamingUIMessages } from "./useStreamingUIMessages";

/**
 * @deprecated use useThreadMessages or useStreamingThreadMessages instead
 * Use this hook to stream text from a server action, using the
 * toTextStreamResponse or equivalent HTTP streaming endpoint returning text.
 * @param url The URL of the server action to stream text from.
 *   e.g. https://....convex.site/yourendpoint
 * @param threadId The ID of the thread to stream text from.
 * @param token The auth token to use for the request.
 *   e.g. useAuthToken() from @convex-dev/auth/react
 * @returns A tuple containing the {text, loading, error} and a function to call the endpoint
 * with a given prompt, passing up { prompt, threadId } as the body in JSON.
 */
export function useStreamingText(
	url: string,
	threadId: string | null,
	token?: string,
) {
	const [text, setText] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<Error | null>(null);

	const readStream = useMemo(
		() => async (prompt: string) => {
			if (!threadId) return;
			try {
				setText("");
				setLoading(true);
				setError(null);
				const response = await fetch(url, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						...(token ? { Authorization: `Bearer ${token}` } : {}),
					},
					body: JSON.stringify({ prompt, threadId }),
				});
				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}
				if (!response.body) {
					throw new Error("No body");
				}
				const reader = response.body.getReader();
				const decoder = new TextDecoder();
				let accumulatedText = "";

				while (true) {
					const { done, value } = await reader.read();
					if (done) {
						break;
					}
					accumulatedText += decoder.decode(value);
					setText(accumulatedText);
				}
			} catch (e) {
				if (e instanceof Error && e.name !== "AbortError") {
					setError(e);
				}
			} finally {
				setLoading(false);
			}
		},
		[threadId, token, url],
	);
	return [{ text, loading, error }, readStream] as const;
}
