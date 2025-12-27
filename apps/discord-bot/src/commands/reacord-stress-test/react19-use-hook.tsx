import {
	ActionRow,
	Button,
	Container,
	Separator,
	TextDisplay,
	useInstance,
} from "@packages/reacord";
import { Fragment, Suspense, use, useState } from "react";

interface UserData {
	id: string;
	name: string;
	email: string;
	role: string;
	joinedAt: string;
	posts: number;
	followers: number;
}

function createUserPromise(userId: string): Promise<UserData> {
	return new Promise((resolve, reject) => {
		setTimeout(
			() => {
				if (Math.random() < 0.1) {
					reject(new Error("Failed to fetch user"));
					return;
				}
				resolve({
					id: userId,
					name: `User_${userId}`,
					email: `user${userId}@example.com`,
					role:
						["Admin", "Moderator", "Member", "Guest"][
							Math.floor(Math.random() * 4)
						] ?? "Member",
					joinedAt: new Date(
						Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000,
					).toLocaleDateString(),
					posts: Math.floor(Math.random() * 500),
					followers: Math.floor(Math.random() * 10000),
				});
			},
			1500 + Math.random() * 1000,
		);
	});
}

interface UserCardProps {
	userPromise: Promise<UserData>;
}

function UserCard({ userPromise }: UserCardProps) {
	const user = use(userPromise);

	const roleColor =
		{
			Admin: 0xed4245,
			Moderator: 0xfee75c,
			Member: 0x57f287,
			Guest: 0x99aab5,
		}[user.role] ?? 0x99aab5;

	return (
		<Container accentColor={roleColor}>
			<TextDisplay>### {user.name}</TextDisplay>
			<TextDisplay>**Role:** {user.role}</TextDisplay>
			<TextDisplay>**Email:** {user.email}</TextDisplay>
			<TextDisplay>**Joined:** {user.joinedAt}</TextDisplay>
			<Separator spacing="small" />
			<TextDisplay>
				**Posts:** {user.posts} | **Followers:**{" "}
				{user.followers.toLocaleString()}
			</TextDisplay>
		</Container>
	);
}

function LoadingCard() {
	return (
		<Container accentColor={0x5865f2}>
			<TextDisplay>### Loading user...</TextDisplay>
			<TextDisplay>⏳ Fetching data from server...</TextDisplay>
		</Container>
	);
}

interface ErrorBoundaryProps {
	children: React.ReactNode;
	fallback: React.ReactNode;
}

function ErrorBoundaryFallback({
	error,
	onRetry,
}: {
	error: string;
	onRetry: () => void;
}) {
	return (
		<>
			<Container accentColor={0xed4245}>
				<TextDisplay>### Error Loading User</TextDisplay>
				<TextDisplay>{error}</TextDisplay>
			</Container>
			<ActionRow>
				<Button label="Retry" style="primary" onClick={onRetry} />
			</ActionRow>
		</>
	);
}

export function React19UseHookScenario() {
	const instance = useInstance();
	const [userPromises, setUserPromises] = useState<
		Map<string, Promise<UserData>>
	>(new Map());
	const [erroredUsers, setErroredUsers] = useState<Set<string>>(new Set());
	const [loadedCount, setLoadedCount] = useState(0);

	const loadUser = (userId: string) => {
		const promise = createUserPromise(userId);
		setUserPromises((prev) => new Map(prev).set(userId, promise));
		setErroredUsers((prev) => {
			const next = new Set(prev);
			next.delete(userId);
			return next;
		});

		promise
			.then(() => setLoadedCount((c) => c + 1))
			.catch(() => {
				setErroredUsers((prev) => new Set(prev).add(userId));
			});
	};

	const loadMultiple = () => {
		const baseId = Date.now();
		for (let i = 0; i < 3; i++) {
			loadUser(String(baseId + i));
		}
	};

	const clearAll = () => {
		setUserPromises(new Map());
		setErroredUsers(new Set());
		setLoadedCount(0);
	};

	return (
		<>
			<Container accentColor={0x5865f2}>
				<TextDisplay>## React 19: use() Hook</TextDisplay>
				<TextDisplay>
					The `use()` hook allows reading promises directly in render. Combined
					with Suspense for loading states. ~10% chance of error.
				</TextDisplay>
			</Container>

			<Container accentColor={0x2f3136}>
				<TextDisplay>
					**Loaded:** {loadedCount} | **Pending:**{" "}
					{userPromises.size - loadedCount - erroredUsers.size} | **Errors:**{" "}
					{erroredUsers.size}
				</TextDisplay>
			</Container>

			<Separator />

			{userPromises.size === 0 ? (
				<Container accentColor={0x99aab5}>
					<TextDisplay>
						Click a button below to load users using the `use()` hook.
					</TextDisplay>
				</Container>
			) : (
				Array.from(userPromises.entries()).map(([userId, promise]) => (
					<Fragment key={userId}>
						{erroredUsers.has(userId) ? (
							<ErrorBoundaryFallback
								error="Failed to fetch user data"
								onRetry={() => loadUser(userId)}
							/>
						) : (
							<Suspense fallback={<LoadingCard />}>
								<UserCard userPromise={promise} />
							</Suspense>
						)}
					</Fragment>
				))
			)}

			<Separator />

			<ActionRow>
				<Button
					label="Load Single User"
					style="primary"
					onClick={() => loadUser(String(Date.now()))}
				/>
				<Button label="Load 3 Users" style="secondary" onClick={loadMultiple} />
				<Button label="Clear All" style="secondary" onClick={clearAll} />
			</ActionRow>

			<ActionRow>
				<Button
					label="Close"
					style="danger"
					onClick={() => instance.destroy()}
				/>
			</ActionRow>
		</>
	);
}
