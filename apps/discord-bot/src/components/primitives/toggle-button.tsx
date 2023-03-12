import { Button } from "@answeroverflow/discordjs-react";
import type { ButtonInteraction } from "discord.js";
import React from "react";

export type ToggleButtonProps = {
	currentlyEnabled: boolean;
	enableLabel: string;
	disableLabel: string;
	disabled?: boolean;
	onClick?: (event: ButtonInteraction, enabled: boolean) => unknown | Promise<unknown>;
};

export function ToggleButton({
	currentlyEnabled,
	enableLabel,
	disableLabel,
	onClick,
	disabled = false
}: ToggleButtonProps) {
	const label = currentlyEnabled ? disableLabel : enableLabel;
	const style = currentlyEnabled ? "Danger" : "Success";
	return (
		<Button
			label={label}
			disabled={disabled}
			style={disabled ? "Secondary" : style}
			onClick={(interaction) => (onClick ? onClick(interaction, !currentlyEnabled) : null)}
		/>
	);
}
