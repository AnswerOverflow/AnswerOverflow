import {
	ActionRow,
	Button,
	Container,
	Link,
	Section,
	Separator,
	TextDisplay,
	useInstance,
} from "@packages/reacord";
import { useState } from "react";

export function UserProfileScenario() {
	const [following, setFollowing] = useState(false);
	const instance = useInstance();

	return (
		<>
			<Section
				accessory={{
					type: "thumbnail",
					url: "https://cdn.discordapp.com/embed/avatars/1.png",
				}}
			>
				<TextDisplay>## Wumpus</TextDisplay>
				<TextDisplay>@wumpus</TextDisplay>
			</Section>

			<Container accentColor={0x57f287}>
				<TextDisplay>
					Discord's beloved mascot. I love playing games, making friends, and
					exploring new servers!
				</TextDisplay>
				<Separator spacing="small" />
				<TextDisplay>
					**Joined:** Jan 2015 | **Followers:** 1.2M | **Following:** 42
				</TextDisplay>
			</Container>

			<TextDisplay>### Recent Activity</TextDisplay>

			<Container accentColor={0x5865f2}>
				<TextDisplay>
					Just finished streaming for 8 hours! Thanks everyone for hanging out
				</TextDisplay>
				<TextDisplay>-# 2 hours ago</TextDisplay>
			</Container>

			<Container accentColor={0x5865f2}>
				<TextDisplay>Check out this cool new game I found!</TextDisplay>
				<TextDisplay>-# 5 hours ago</TextDisplay>
			</Container>

			<ActionRow>
				<Button
					label={following ? "Following" : "Follow"}
					style={following ? "secondary" : "primary"}
					onClick={() => setFollowing((f) => !f)}
				/>
				<Button label="Message" style="secondary" onClick={() => {}} />
				<Link url="https://discord.com" label="View Full Profile" />
				<Button
					label="Close"
					style="danger"
					onClick={() => instance.destroy()}
				/>
			</ActionRow>
		</>
	);
}
