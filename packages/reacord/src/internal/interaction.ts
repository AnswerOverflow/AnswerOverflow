import type {
	ButtonInteraction,
	StringSelectMenuInteraction,
} from "discord.js";

export type ComponentInteraction =
	| ReacordButtonInteraction
	| ReacordSelectInteraction;

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
