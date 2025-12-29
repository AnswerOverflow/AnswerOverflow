import {
	ActionRow,
	Button,
	Container,
	ModalButton,
	Separator,
	TextDisplay,
	useInstance,
} from "@packages/reacord";
import { useActionState, useState, useTransition } from "react";

interface FormState {
	success: boolean;
	message: string;
	data: {
		username?: string;
		email?: string;
		bio?: string;
	} | null;
	submittedAt: Date | null;
}

const initialState: FormState = {
	success: false,
	message: "Fill out the form to get started",
	data: null,
	submittedAt: null,
};

async function submitFormAction(
	_prevState: FormState,
	formData: { username: string; email: string; bio: string },
): Promise<FormState> {
	await new Promise((resolve) => setTimeout(resolve, 2000));

	if (!formData.username || formData.username.length < 3) {
		return {
			success: false,
			message: "Username must be at least 3 characters",
			data: null,
			submittedAt: null,
		};
	}

	if (!formData.email || !formData.email.includes("@")) {
		return {
			success: false,
			message: "Please enter a valid email address",
			data: null,
			submittedAt: null,
		};
	}

	if (Math.random() < 0.15) {
		return {
			success: false,
			message: "Server error: Please try again",
			data: null,
			submittedAt: null,
		};
	}

	return {
		success: true,
		message: "Profile updated successfully!",
		data: formData,
		submittedAt: new Date(),
	};
}

export function React19ActionStateScenario() {
	const instance = useInstance();
	const [pendingData, setPendingData] = useState<{
		username: string;
		email: string;
		bio: string;
	} | null>(null);

	const [state, formAction, isPending] = useActionState(
		async (
			prevState: FormState,
			formData: { username: string; email: string; bio: string },
		) => {
			setPendingData(formData);
			const result = await submitFormAction(prevState, formData);
			setPendingData(null);
			return result;
		},
		initialState,
	);
	const [, startFormTransition] = useTransition();

	const submitForm = (data: {
		username: string;
		email: string;
		bio: string;
	}) => {
		startFormTransition(() => {
			formAction(data);
		});
	};

	const submitCount = useState(0)[0];

	return (
		<>
			<Container accentColor={0x5865f2}>
				<TextDisplay>## React 19: useActionState Hook</TextDisplay>
				<TextDisplay>
					Form handling with built-in pending state and automatic state updates.
					~15% chance of simulated server error.
				</TextDisplay>
			</Container>

			<Separator />

			<Container
				accentColor={
					state.success
						? 0x57f287
						: state.data === null && !isPending
							? 0x99aab5
							: 0xfee75c
				}
			>
				<TextDisplay>### Form Status</TextDisplay>
				<TextDisplay>
					**Status:**{" "}
					{isPending
						? "⏳ Submitting..."
						: state.success
							? "✅ Success"
							: `📝 ${state.message}`}
				</TextDisplay>
				{isPending && pendingData && (
					<>
						<Separator spacing="small" />
						<TextDisplay>_Submitting: {pendingData.username}_</TextDisplay>
					</>
				)}
			</Container>

			{state.data && state.submittedAt && (
				<Container accentColor={0x57f287}>
					<TextDisplay>### Submitted Data</TextDisplay>
					<TextDisplay>**Username:** {state.data.username}</TextDisplay>
					<TextDisplay>**Email:** {state.data.email}</TextDisplay>
					<TextDisplay>**Bio:** {state.data.bio || "_None_"}</TextDisplay>
					<Separator spacing="small" />
					<TextDisplay>
						_Submitted at {state.submittedAt.toLocaleTimeString()}_
					</TextDisplay>
				</Container>
			)}

			<Container accentColor={0x2f3136}>
				<TextDisplay>### Pending State</TextDisplay>
				<TextDisplay>**isPending:** `{String(isPending)}`</TextDisplay>
				<TextDisplay>**Submit count:** {submitCount}</TextDisplay>
			</Container>

			<ActionRow>
				<ModalButton
					label={isPending ? "Submitting..." : "Edit Profile"}
					style="primary"
					disabled={isPending}
					modalTitle="Edit Profile"
					fields={[
						{
							type: "textInput",
							id: "username",
							label: "Username",
							style: "short",
							placeholder: "Enter your username (min 3 chars)",
							required: true,
							maxLength: 32,
							defaultValue: state.data?.username ?? "",
						},
						{
							type: "textInput",
							id: "email",
							label: "Email",
							style: "short",
							placeholder: "your@email.com",
							required: true,
							maxLength: 100,
							defaultValue: state.data?.email ?? "",
						},
						{
							type: "textInput",
							id: "bio",
							label: "Bio",
							style: "paragraph",
							placeholder: "Tell us about yourself...",
							required: false,
							maxLength: 500,
							defaultValue: state.data?.bio ?? "",
						},
					]}
					onSubmit={(values) => {
						const username = values.getTextInput("username") ?? "";
						const email = values.getTextInput("email") ?? "";
						const bio = values.getTextInput("bio") ?? "";
						submitForm({ username, email, bio });
					}}
				/>
			</ActionRow>

			<ActionRow>
				<Button
					label="Quick Submit (Valid)"
					style="success"
					disabled={isPending}
					onClick={() => {
						submitForm({
							username: `User${Math.floor(Math.random() * 1000)}`,
							email: `test${Math.floor(Math.random() * 1000)}@example.com`,
							bio: "Auto-generated profile",
						});
					}}
				/>
				<Button
					label="Quick Submit (Invalid)"
					style="secondary"
					disabled={isPending}
					onClick={() => {
						submitForm({
							username: "ab",
							email: "invalid",
							bio: "",
						});
					}}
				/>
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
