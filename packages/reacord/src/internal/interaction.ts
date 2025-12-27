import type {
	ButtonInteraction,
	ModalSubmitInteraction,
	StringSelectMenuInteraction,
} from "discord.js";

export type ComponentInteraction =
	| ReacordButtonInteraction
	| ReacordSelectInteraction
	| ReacordModalInteraction;

export interface ReacordButtonInteraction {
	type: "button";
	customId: string;
	interaction: ButtonInteraction;
}

export interface ReacordSelectInteraction {
	type: "select";
	customId: string;
	values: string[];
	interaction: StringSelectMenuInteraction;
}

export interface ReacordModalInteraction {
	type: "modal";
	customId: string;
	fields: Map<string, string>;
	interaction: ModalSubmitInteraction;
}
