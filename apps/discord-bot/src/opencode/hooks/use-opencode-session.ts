import {
	createOpencodeClient,
	type Event,
	type Message,
	type OpencodeClient,
	type Part,
	type Session,
	type SessionStatus,
	type Todo,
} from "@opencode-ai/sdk";
import { useCallback, useEffect, useRef, useState } from "react";

export { createOpencodeClient, type OpencodeClient };

export interface UseOpenCodeSessionOptions {
	client: OpencodeClient;
	sessionId?: string;
}

export interface UseOpenCodeSessionResult {
	session: Session | null;
	messages: Message[];
	parts: Map<string, Part[]>;
	todos: Todo[];
	status: SessionStatus;
	error: Error | null;
	isConnected: boolean;
	setSessionId: (id: string) => void;
	sendMessage: (
		content: string,
		agent?: string,
		model?: { providerID: string; modelID: string },
	) => Promise<void>;
	abort: () => Promise<void>;
	share: () => Promise<string | null>;
	compact: () => Promise<void>;
}

export function useOpenCodeSession(
	options: UseOpenCodeSessionOptions,
): UseOpenCodeSessionResult {
	const { client, sessionId: initialSessionId } = options;

	const [session, setSession] = useState<Session | null>(null);
	const [messages, setMessages] = useState<Message[]>([]);
	const [parts, setParts] = useState<Map<string, Part[]>>(new Map());
	const [todos, setTodos] = useState<Todo[]>([]);
	const [status, setStatus] = useState<SessionStatus>({ type: "idle" });
	const [error, setError] = useState<Error | null>(null);
	const [isConnected, setIsConnected] = useState(false);

	const sessionIdRef = useRef<string | null>(initialSessionId ?? null);

	const handleEvent = useCallback((event: Event) => {
		switch (event.type) {
			case "session.updated": {
				const { info } = event.properties;
				if (sessionIdRef.current && info.id === sessionIdRef.current) {
					setSession(info);
				}
				break;
			}

			case "session.status": {
				const { sessionID, status: newStatus } = event.properties;
				if (sessionIdRef.current === sessionID) {
					setStatus(newStatus);
				}
				break;
			}

			case "message.updated": {
				const { info } = event.properties;
				if (sessionIdRef.current === info.sessionID) {
					setMessages((prev) => {
						const existing = prev.findIndex((m) => m.id === info.id);
						if (existing >= 0) {
							const updated = [...prev];
							updated[existing] = info;
							return updated;
						}
						const newMessages = [...prev, info];
						newMessages.sort((a, b) => a.time.created - b.time.created);
						return newMessages;
					});
				}
				break;
			}

			case "message.part.updated": {
				const { part } = event.properties;
				if (sessionIdRef.current === part.sessionID) {
					setParts((prev) => {
						const newParts = new Map(prev);
						const messageParts = [...(newParts.get(part.messageID) ?? [])];
						const existingIndex = messageParts.findIndex(
							(p) => p.id === part.id,
						);
						if (existingIndex >= 0) {
							messageParts[existingIndex] = part;
						} else {
							messageParts.push(part);
						}
						newParts.set(part.messageID, messageParts);
						return newParts;
					});
				}
				break;
			}

			case "todo.updated": {
				const { sessionID, todos: newTodos } = event.properties;
				if (sessionIdRef.current === sessionID) {
					setTodos(newTodos);
				}
				break;
			}

			case "session.error": {
				const { sessionID, error: sessionError } = event.properties;
				if (!sessionID || sessionIdRef.current === sessionID) {
					if (sessionError) {
						const errorMessage =
							"message" in sessionError.data &&
							typeof sessionError.data.message === "string"
								? sessionError.data.message
								: sessionError.name;
						setError(new Error(errorMessage));
					}
				}
				break;
			}
		}
	}, []);

	const sendMessage = useCallback(
		async (
			content: string,
			agent?: string,
			model?: { providerID: string; modelID: string },
		) => {
			if (!sessionIdRef.current) {
				const response = await client.session.create();
				if (response.error) {
					throw new Error("Failed to create session");
				}
				setSession(response.data);
				sessionIdRef.current = response.data.id;
			}

			await client.session.prompt({
				path: { id: sessionIdRef.current },
				body: {
					parts: [{ type: "text", text: content }],
					agent,
					model: model ?? {
						providerID: "anthropic",
						modelID: "claude-opus-4-5-20251101",
					},
					system:
						"Do not spawn subagents or use the Task tool. Complete all work directly yourself.",
				},
			});
		},
		[client],
	);

	const abort = useCallback(async () => {
		if (!sessionIdRef.current) return;
		await client.session.abort({
			path: { id: sessionIdRef.current },
		});
	}, [client]);

	const share = useCallback(async (): Promise<string | null> => {
		if (!sessionIdRef.current) return null;
		const response = await client.session.share({
			path: { id: sessionIdRef.current },
		});
		if (response.error || !response.data) return null;
		return response.data.share?.url ?? null;
	}, [client]);

	const compact = useCallback(async () => {
		if (!sessionIdRef.current) return;
		await client.session.summarize({
			path: { id: sessionIdRef.current },
		});
	}, [client]);

	useEffect(() => {
		let aborted = false;
		let streamRef: AsyncGenerator<Event, unknown, unknown> | null = null;

		const loadInitialData = async () => {
			try {
				if (initialSessionId) {
					const [sessionRes, messagesRes, todosRes, statusRes] =
						await Promise.all([
							client.session.get({ path: { id: initialSessionId } }),
							client.session.messages({ path: { id: initialSessionId } }),
							client.session.todo({ path: { id: initialSessionId } }),
							client.session.status(),
						]);

					if (aborted) return;

					if (sessionRes.data) setSession(sessionRes.data);
					if (messagesRes.data) {
						setMessages(messagesRes.data.map((m) => m.info));
						const partsMap = new Map<string, Part[]>();
						for (const m of messagesRes.data) {
							if (m.parts.length > 0) {
								partsMap.set(m.info.id, m.parts);
							}
						}
						setParts(partsMap);
					}
					if (todosRes.data) setTodos(todosRes.data);
					if (statusRes.data?.status) setStatus(statusRes.data.status);
				}
			} catch (e) {
				if (!aborted) {
					setError(e instanceof Error ? e : new Error(String(e)));
				}
			}
		};

		const subscribeToEvents = async () => {
			try {
				const result = await client.event.subscribe();
				if (aborted) return;

				streamRef = result.stream;
				setIsConnected(true);

				for await (const event of result.stream) {
					if (aborted) break;
					handleEvent(event);
				}
			} catch (e) {
				if (!aborted && (e as Error).name !== "AbortError") {
					console.error("Event subscription error:", e);
					setIsConnected(false);
				}
			}
		};

		loadInitialData();
		subscribeToEvents();

		return () => {
			aborted = true;
			streamRef?.return?.(undefined);
		};
	}, [initialSessionId, client, handleEvent]);

	const setSessionId = useCallback((id: string) => {
		sessionIdRef.current = id;
	}, []);

	return {
		session,
		messages,
		parts,
		todos,
		status,
		error,
		isConnected,
		setSessionId,
		sendMessage,
		abort,
		share,
		compact,
	};
}
