import {
	ActionRow,
	Button,
	Container,
	Option,
	Select,
	Separator,
	TextDisplay,
	useInstance,
} from "@packages/reacord";
import {
	Suspense,
	use,
	useActionState,
	useDeferredValue,
	useId,
	useOptimistic,
	useState,
	useTransition,
} from "react";

interface Post {
	id: string;
	title: string;
	content: string;
	likes: number;
	liked: boolean;
	pending?: boolean;
}

interface Comment {
	id: string;
	postId: string;
	text: string;
	author: string;
	timestamp: Date;
}

function createPostPromise(postId: string): Promise<Post> {
	return new Promise((resolve, reject) => {
		setTimeout(
			() => {
				if (Math.random() < 0.1) {
					reject(new Error("Failed to load post"));
					return;
				}
				resolve({
					id: postId,
					title: `Post #${postId.slice(-4)}`,
					content: `This is the content of post ${postId}. It was loaded asynchronously using React 19's use() hook with Suspense.`,
					likes: Math.floor(Math.random() * 100),
					liked: false,
				});
			},
			1000 + Math.random() * 1000,
		);
	});
}

function createCommentsPromise(postId: string): Promise<Comment[]> {
	return new Promise((resolve) => {
		setTimeout(
			() => {
				const count = Math.floor(Math.random() * 3) + 1;
				resolve(
					Array.from({ length: count }, (_, i) => ({
						id: `${postId}-comment-${i}`,
						postId,
						text:
							[
								"Great post!",
								"Very insightful",
								"Thanks for sharing!",
								"I learned something new",
							][i % 4] ?? "Nice!",
						author: ["Alice", "Bob", "Charlie", "Diana"][i % 4] ?? "User",
						timestamp: new Date(Date.now() - Math.random() * 86400000),
					})),
				);
			},
			800 + Math.random() * 500,
		);
	});
}

function PostContent({ postPromise }: { postPromise: Promise<Post> }) {
	const post = use(postPromise);
	return (
		<>
			<TextDisplay>### {post.title}</TextDisplay>
			<TextDisplay>{post.content}</TextDisplay>
			<TextDisplay>
				**Likes:** {post.likes} | **Status:**{" "}
				{post.liked ? "❤️ Liked" : "🤍 Not liked"}
			</TextDisplay>
		</>
	);
}

function CommentsContent({
	commentsPromise,
}: {
	commentsPromise: Promise<Comment[]>;
}) {
	const comments = use(commentsPromise);
	return (
		<>
			<TextDisplay>**Comments ({comments.length}):**</TextDisplay>
			{comments.map((comment) => (
				<TextDisplay key={comment.id}>
					• **{comment.author}:** {comment.text}
				</TextDisplay>
			))}
		</>
	);
}

function LoadingPost() {
	return (
		<>
			<TextDisplay>### ⏳ Loading post...</TextDisplay>
			<TextDisplay>_Fetching data with Suspense..._</TextDisplay>
		</>
	);
}

function LoadingComments() {
	return <TextDisplay>_Loading comments..._</TextDisplay>;
}

interface LikeState {
	likes: number;
	liked: boolean;
	lastAction: string;
}

async function processLikeAction(
	prevState: LikeState,
	_action: { postId: string },
): Promise<LikeState> {
	await new Promise((resolve) => setTimeout(resolve, 800));

	if (Math.random() < 0.15) {
		return {
			...prevState,
			lastAction: "Failed to update like",
		};
	}

	return {
		likes: prevState.liked ? prevState.likes - 1 : prevState.likes + 1,
		liked: !prevState.liked,
		lastAction: prevState.liked ? "Unliked" : "Liked",
	};
}

interface SearchResult {
	id: string;
	title: string;
	relevance: number;
}

function SearchResults({ query }: { query: string }) {
	const deferredQuery = useDeferredValue(query);
	const isStale = query !== deferredQuery;

	const results: SearchResult[] = deferredQuery
		? [
				{ id: "1", title: `Result for "${deferredQuery}" #1`, relevance: 95 },
				{ id: "2", title: `Result for "${deferredQuery}" #2`, relevance: 87 },
				{ id: "3", title: `Result for "${deferredQuery}" #3`, relevance: 72 },
			]
		: [];

	if (!deferredQuery) {
		return <TextDisplay>_Type something to search..._</TextDisplay>;
	}

	return (
		<>
			<TextDisplay>
				{isStale ? "⏳ Searching..." : `**Results for "${deferredQuery}":**`}
			</TextDisplay>
			{results.map((result) => (
				<TextDisplay key={result.id}>
					• {result.title} ({result.relevance}% match)
				</TextDisplay>
			))}
		</>
	);
}

type Tab = "suspense" | "optimistic" | "actionState" | "deferred" | "hooks";

export function ReactKitchenSinkScenario() {
	const instance = useInstance();
	const componentId = useId();
	const [activeTab, setActiveTab] = useState<Tab>("suspense");

	const [postPromise, setPostPromise] = useState<Promise<Post>>(() =>
		createPostPromise(`post-${Date.now()}`),
	);
	const [commentsPromise, setCommentsPromise] = useState<Promise<Comment[]>>(
		() => createCommentsPromise(`post-${Date.now()}`),
	);
	const [postError, setPostError] = useState<string | null>(null);

	const [messages, setMessages] = useState<string[]>(["Welcome!"]);
	const [isPending, startTransition] = useTransition();
	const [optimisticMessages, addOptimisticMessage] = useOptimistic(
		messages,
		(state, newMsg: string) => [...state, `⏳ ${newMsg}`],
	);

	const [likeState, dispatchLike, isLikePending] = useActionState(
		processLikeAction,
		{
			likes: 42,
			liked: false,
			lastAction: "Ready",
		},
	);
	const [, startLikeTransition] = useTransition();

	const [searchQuery, setSearchQuery] = useState("react");

	const loadPost = () => {
		const id = `post-${Date.now()}`;
		setPostError(null);
		const postProm = createPostPromise(id);
		postProm.catch((e) => setPostError(e.message));
		setPostPromise(postProm);
		setCommentsPromise(createCommentsPromise(id));
	};

	const sendOptimisticMessage = (text: string) => {
		startTransition(async () => {
			addOptimisticMessage(text);
			await new Promise((resolve) => setTimeout(resolve, 1500));
			setMessages((prev) => [...prev, `✓ ${text}`]);
		});
	};

	return (
		<>
			<Container accentColor={0x5865f2}>
				<TextDisplay>## React 19 Kitchen Sink</TextDisplay>
				<TextDisplay>
					All React 19 features in one demo. **ID:** `{componentId}`
				</TextDisplay>
			</Container>

			<ActionRow>
				<Button
					label="Suspense"
					style={activeTab === "suspense" ? "primary" : "secondary"}
					onClick={() => setActiveTab("suspense")}
				/>
				<Button
					label="Optimistic"
					style={activeTab === "optimistic" ? "primary" : "secondary"}
					onClick={() => setActiveTab("optimistic")}
				/>
				<Button
					label="ActionState"
					style={activeTab === "actionState" ? "primary" : "secondary"}
					onClick={() => setActiveTab("actionState")}
				/>
				<Button
					label="Deferred"
					style={activeTab === "deferred" ? "primary" : "secondary"}
					onClick={() => setActiveTab("deferred")}
				/>
			</ActionRow>

			{activeTab === "suspense" && (
				<>
					<Container accentColor={0x2f3136}>
						<TextDisplay>### Suspense + use() Hook</TextDisplay>
						<TextDisplay>
							Load async data with automatic loading states. The `use()` hook
							reads promises directly in render.
						</TextDisplay>
					</Container>

					<Separator />

					{postError ? (
						<Container accentColor={0xed4245}>
							<TextDisplay>### Error</TextDisplay>
							<TextDisplay>{postError}</TextDisplay>
						</Container>
					) : (
						<Container accentColor={0x57f287}>
							<Suspense fallback={<LoadingPost />}>
								<PostContent postPromise={postPromise} />
								<Separator spacing="small" />
								<Suspense fallback={<LoadingComments />}>
									<CommentsContent commentsPromise={commentsPromise} />
								</Suspense>
							</Suspense>
						</Container>
					)}

					<ActionRow>
						<Button
							label="🔄 Load Another"
							style="primary"
							onClick={loadPost}
						/>
						<Button
							label="Close"
							style="danger"
							onClick={() => instance.destroy()}
						/>
					</ActionRow>
				</>
			)}

			{activeTab === "optimistic" && (
				<>
					<Container accentColor={0x2f3136}>
						<TextDisplay>### useOptimistic + useTransition</TextDisplay>
						<TextDisplay>
							Messages appear instantly while sending in the background.
							Optimistic updates provide immediate feedback.
						</TextDisplay>
					</Container>

					<Separator />

					<Container accentColor={isPending ? 0xfee75c : 0x57f287}>
						<TextDisplay>
							**Status:** {isPending ? "⏳ Sending..." : "✓ Ready"}
						</TextDisplay>
						<Separator spacing="small" />
						{optimisticMessages.slice(-5).map((msg, i) => (
							<TextDisplay key={i}>• {msg}</TextDisplay>
						))}
					</Container>

					<ActionRow>
						<Button
							label="Send Hello"
							style="primary"
							disabled={isPending}
							onClick={() => sendOptimisticMessage("Hello!")}
						/>
						<Button
							label="Send Update"
							style="primary"
							disabled={isPending}
							onClick={() => sendOptimisticMessage("New update!")}
						/>
						<Button
							label="Clear"
							style="secondary"
							onClick={() => setMessages(["Welcome!"])}
						/>
						<Button
							label="Close"
							style="danger"
							onClick={() => instance.destroy()}
						/>
					</ActionRow>
				</>
			)}

			{activeTab === "actionState" && (
				<>
					<Container accentColor={0x2f3136}>
						<TextDisplay>### useActionState</TextDisplay>
						<TextDisplay>
							Server actions with built-in pending state. Like/unlike with
							automatic state management. ~15% failure rate.
						</TextDisplay>
					</Container>

					<Separator />

					<Container
						accentColor={
							likeState.lastAction.includes("Failed")
								? 0xed4245
								: isLikePending
									? 0xfee75c
									: 0x57f287
						}
					>
						<TextDisplay>
							**Likes:** {likeState.likes} |{" "}
							{likeState.liked ? "❤️ You liked this" : "🤍 Not liked"}
						</TextDisplay>
						<TextDisplay>
							**Status:**{" "}
							{isLikePending ? "Processing..." : likeState.lastAction}
						</TextDisplay>
					</Container>

					<ActionRow>
						<Button
							label={
								isLikePending ? "..." : likeState.liked ? "Unlike" : "Like"
							}
							style={likeState.liked ? "danger" : "success"}
							disabled={isLikePending}
							onClick={() => {
								startLikeTransition(() => {
									dispatchLike({ postId: "demo" });
								});
							}}
						/>
						<Button
							label="Close"
							style="danger"
							onClick={() => instance.destroy()}
						/>
					</ActionRow>
				</>
			)}

			{activeTab === "deferred" && (
				<>
					<Container accentColor={0x2f3136}>
						<TextDisplay>### useDeferredValue</TextDisplay>
						<TextDisplay>
							Deferred values let React prioritize urgent updates. Search
							results update without blocking the UI.
						</TextDisplay>
					</Container>

					<Separator />

					<Select
						placeholder="Select a search term"
						value={searchQuery}
						onSelect={setSearchQuery}
					>
						<Option value="react" label="react" />
						<Option value="hooks" label="hooks" />
						<Option value="suspense" label="suspense" />
						<Option value="typescript" label="typescript" />
					</Select>

					<Container accentColor={0x99aab5}>
						<SearchResults query={searchQuery} />
					</Container>

					<ActionRow>
						<Button
							label="Close"
							style="danger"
							onClick={() => instance.destroy()}
						/>
					</ActionRow>
				</>
			)}
		</>
	);
}
