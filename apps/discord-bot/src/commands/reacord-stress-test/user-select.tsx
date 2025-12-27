import {
	ActionRow,
	Button,
	Container,
	Separator,
	TextDisplay,
	UserSelect,
	useInstance,
} from "@packages/reacord";
import { useState } from "react";

export function UserSelectScenario() {
	const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
	const instance = useInstance();

	return (
		<>
			<Container accentColor={0x5865f2}>
				<TextDisplay>## User Select Demo</TextDisplay>
				<TextDisplay>
					Select users from the server to add to your team.
				</TextDisplay>
				<Separator spacing="small" />
				<TextDisplay>
					**Selected:**{" "}
					{selectedUsers.length > 0
						? selectedUsers.map((id) => `<@${id}>`).join(", ")
						: "_None_"}
				</TextDisplay>
			</Container>

			<UserSelect
				placeholder="Select team members"
				minValues={1}
				maxValues={5}
				onSelectMultiple={(userIds) => setSelectedUsers(userIds)}
			/>

			<ActionRow>
				<Button
					label="Clear Selection"
					style="secondary"
					onClick={() => setSelectedUsers([])}
				/>
				<Button
					label="Confirm Team"
					style="success"
					disabled={selectedUsers.length === 0}
					onClick={() => instance.destroy()}
				/>
				<Button
					label="Close"
					style="danger"
					onClick={() => instance.destroy()}
				/>
			</ActionRow>
		</>
	);
}
