import {
	ActionRow,
	Button,
	Container,
	ModalButton,
	Option,
	Select,
	Separator,
	TextDisplay,
	useInstance,
} from "@packages/reacord";
import { useState } from "react";

export function WizardScenario() {
	const [step, setStep] = useState(0);
	const [data, setData] = useState({
		serverName: "",
		serverType: "",
		features: [] as string[],
	});
	const instance = useInstance();

	const steps = [
		{
			title: "Server Name",
			description: "What would you like to call your server?",
		},
		{
			title: "Server Type",
			description: "What kind of community are you building?",
		},
		{ title: "Features", description: "Select the features you want enabled" },
		{ title: "Review", description: "Review your choices before creating" },
	];

	const currentStep = steps[step];
	if (!currentStep) return null;

	const progress = `${"█".repeat(step + 1)}${"░".repeat(steps.length - step - 1)}`;

	return (
		<>
			<Container accentColor={0x5865f2}>
				<TextDisplay>## Server Setup Wizard</TextDisplay>
				<TextDisplay>
					**Step {step + 1}/{steps.length}:** {currentStep.title}
				</TextDisplay>
				<TextDisplay>`{progress}`</TextDisplay>
			</Container>

			<Container accentColor={0x99aab5}>
				<TextDisplay>{currentStep.description}</TextDisplay>
				{step === 0 && (
					<TextDisplay>
						**Current:** {data.serverName || "_Not set_"}
					</TextDisplay>
				)}
				{step === 1 && (
					<TextDisplay>
						**Selected:** {data.serverType || "_Not selected_"}
					</TextDisplay>
				)}
				{step === 2 && (
					<TextDisplay>
						**Enabled:** {data.features.join(", ") || "_None_"}
					</TextDisplay>
				)}
				{step === 3 && (
					<>
						<Separator spacing="small" />
						<TextDisplay>**Server Name:** {data.serverName}</TextDisplay>
						<TextDisplay>**Type:** {data.serverType}</TextDisplay>
						<TextDisplay>**Features:** {data.features.join(", ")}</TextDisplay>
					</>
				)}
			</Container>

			{step === 0 && (
				<ActionRow>
					<ModalButton
						label="Set Name"
						modalTitle="Server Name"
						fields={[
							{
								type: "textInput",
								id: "name",
								label: "Server Name",
								style: "short",
								defaultValue: data.serverName,
								maxLength: 100,
								required: true,
							},
						]}
						onSubmit={(values) => {
							const name = values.getTextInput("name");
							if (name) setData((d) => ({ ...d, serverName: name }));
						}}
					/>
				</ActionRow>
			)}

			{step === 1 && (
				<Select
					placeholder="Select server type"
					value={data.serverType || undefined}
					onSelect={(value) => setData((d) => ({ ...d, serverType: value }))}
				>
					<Option
						value="gaming"
						label="Gaming"
						description="For gaming communities"
					/>
					<Option
						value="education"
						label="Education"
						description="For learning and teaching"
					/>
					<Option
						value="music"
						label="Music"
						description="For music lovers and creators"
					/>
					<Option
						value="tech"
						label="Tech"
						description="For developers and tech enthusiasts"
					/>
				</Select>
			)}

			{step === 2 && (
				<ActionRow>
					<Button
						label={`Welcome ${data.features.includes("welcome") ? "✓" : ""}`}
						style={data.features.includes("welcome") ? "success" : "secondary"}
						onClick={() =>
							setData((d) => ({
								...d,
								features: d.features.includes("welcome")
									? d.features.filter((f) => f !== "welcome")
									: [...d.features, "welcome"],
							}))
						}
					/>
					<Button
						label={`Roles ${data.features.includes("roles") ? "✓" : ""}`}
						style={data.features.includes("roles") ? "success" : "secondary"}
						onClick={() =>
							setData((d) => ({
								...d,
								features: d.features.includes("roles")
									? d.features.filter((f) => f !== "roles")
									: [...d.features, "roles"],
							}))
						}
					/>
					<Button
						label={`Moderation ${data.features.includes("mod") ? "✓" : ""}`}
						style={data.features.includes("mod") ? "success" : "secondary"}
						onClick={() =>
							setData((d) => ({
								...d,
								features: d.features.includes("mod")
									? d.features.filter((f) => f !== "mod")
									: [...d.features, "mod"],
							}))
						}
					/>
				</ActionRow>
			)}

			<ActionRow>
				<Button
					label="Back"
					style="secondary"
					disabled={step === 0}
					onClick={() => setStep((s) => s - 1)}
				/>
				{step < 3 ? (
					<Button
						label="Next"
						style="primary"
						disabled={
							(step === 0 && !data.serverName) ||
							(step === 1 && !data.serverType)
						}
						onClick={() => setStep((s) => s + 1)}
					/>
				) : (
					<Button
						label="Create Server"
						style="success"
						onClick={() => instance.destroy()}
					/>
				)}
				<Button
					label="Cancel"
					style="danger"
					onClick={() => instance.destroy()}
				/>
			</ActionRow>
		</>
	);
}
