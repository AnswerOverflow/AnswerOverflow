import {
	ActionRow,
	Button,
	Container,
	ModalButton,
	Separator,
	TextDisplay,
	useInstance,
} from "@packages/reacord";
import { useState } from "react";

type FormData = {
	title: string;
	description: string;
	category: string;
	assignees: string[];
	hasAttachment: boolean;
};

export function ModalShowcaseScenario() {
	const [formData, setFormData] = useState<FormData>({
		title: "",
		description: "",
		category: "",
		assignees: [],
		hasAttachment: false,
	});
	const instance = useInstance();

	return (
		<>
			<Container accentColor={0xeb459e}>
				<TextDisplay>## Modal Components Showcase</TextDisplay>
				<TextDisplay>
					This scenario tests all available modal field types: TextInput,
					StringSelect, UserSelect, FileUpload, and TextDisplay.
				</TextDisplay>
			</Container>

			<Container accentColor={0x5865f2}>
				<TextDisplay>### Current Form Data</TextDisplay>
				<Separator spacing="small" />
				<TextDisplay>**Title:** {formData.title || "_Not set_"}</TextDisplay>
				<TextDisplay>
					**Description:** {formData.description || "_Not set_"}
				</TextDisplay>
				<TextDisplay>
					**Category:** {formData.category || "_Not selected_"}
				</TextDisplay>
				<TextDisplay>
					**Assignees:**{" "}
					{formData.assignees.length > 0
						? formData.assignees.map((id) => `<@${id}>`).join(", ")
						: "_None_"}
				</TextDisplay>
				<TextDisplay>
					**Has Attachment:** {formData.hasAttachment ? "Yes" : "No"}
				</TextDisplay>
			</Container>

			<ActionRow>
				<ModalButton
					label="Text Inputs"
					style="primary"
					modalTitle="Text Input Fields"
					fields={[
						{
							type: "textDisplay",
							content:
								"Fill in the details below. Short inputs are for titles, paragraph for descriptions.",
						},
						{
							type: "textInput",
							id: "title",
							label: "Title",
							description: "A short title for your submission",
							style: "short",
							placeholder: "Enter a title...",
							defaultValue: formData.title,
							maxLength: 100,
							required: true,
						},
						{
							type: "textInput",
							id: "description",
							label: "Description",
							description: "Provide detailed information",
							style: "paragraph",
							placeholder: "Enter a detailed description...",
							defaultValue: formData.description,
							maxLength: 2000,
							required: false,
						},
					]}
					onSubmit={(values) => {
						const title = values.getTextInput("title");
						const description = values.getTextInput("description");
						setFormData((prev) => ({
							...prev,
							title: title ?? prev.title,
							description: description ?? prev.description,
						}));
					}}
				/>
				<ModalButton
					label="Select Menu"
					style="secondary"
					modalTitle="Category Selection"
					fields={[
						{
							type: "textDisplay",
							content: "Choose a category for your submission.",
						},
						{
							type: "stringSelect",
							id: "category",
							label: "Category",
							description: "Select the most relevant category",
							placeholder: "Choose a category...",
							required: true,
							options: [
								{
									label: "Bug Report",
									value: "bug",
									description: "Report a problem",
								},
								{
									label: "Feature Request",
									value: "feature",
									description: "Suggest an improvement",
								},
								{
									label: "Question",
									value: "question",
									description: "Ask for help",
								},
								{
									label: "Documentation",
									value: "docs",
									description: "Documentation issue",
								},
							],
						},
					]}
					onSubmit={(values) => {
						const category = values.getStringSelect("category");
						if (category && category.length > 0) {
							setFormData((prev) => ({
								...prev,
								category: category[0] ?? prev.category,
							}));
						}
					}}
				/>
			</ActionRow>

			<ActionRow>
				<ModalButton
					label="User Select"
					style="secondary"
					modalTitle="Assign Users"
					fields={[
						{
							type: "textDisplay",
							content:
								"Select users to assign to this task. You can select multiple users.",
						},
						{
							type: "userSelect",
							id: "assignees",
							label: "Assignees",
							description: "Who should work on this?",
							placeholder: "Select users...",
							required: false,
							minValues: 0,
							maxValues: 5,
						},
					]}
					onSubmit={(values) => {
						const assignees = values.getUserSelect("assignees");
						setFormData((prev) => ({
							...prev,
							assignees: assignees ? [...assignees] : [],
						}));
					}}
				/>
				<ModalButton
					label="File Upload"
					style="secondary"
					modalTitle="Upload Attachments"
					fields={[
						{
							type: "textDisplay",
							content:
								"Upload any relevant files. Screenshots, logs, or documents are helpful.",
						},
						{
							type: "fileUpload",
							id: "attachment",
							label: "Attachment",
							description: "Upload a file (optional)",
							required: false,
							maxValues: 3,
						},
					]}
					onSubmit={(values) => {
						const files = values.getFileUpload("attachment");
						setFormData((prev) => ({
							...prev,
							hasAttachment: files !== undefined && files.length > 0,
						}));
					}}
				/>
			</ActionRow>

			<ActionRow>
				<Button
					label="Clear All"
					style="secondary"
					onClick={() =>
						setFormData({
							title: "",
							description: "",
							category: "",
							assignees: [],
							hasAttachment: false,
						})
					}
				/>
				<Button
					label="Submit"
					style="success"
					disabled={!formData.title || !formData.category}
					onClick={() => {
						console.log("Form submitted:", formData);
						instance.destroy();
					}}
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
