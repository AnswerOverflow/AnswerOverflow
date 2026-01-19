"use client";

import { models } from "@packages/database/models";
import {
	ModelSelectorLogo,
	ModelSelectorName,
} from "@packages/ui/components/ai-elements/model-selector";
import { PromptInputButton } from "@packages/ui/components/ai-elements/prompt-input";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@packages/ui/components/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@packages/ui/components/popover";
import { CheckIcon } from "lucide-react";
import { useState } from "react";

export function ModelSelector({
	selectedModel,
	onSelectModel,
	onModelChange,
	compact = false,
}: {
	selectedModel: string;
	onSelectModel: (modelId: string) => void;
	onModelChange?: (modelId: string, previousModelId: string) => void;
	compact?: boolean;
}) {
	const [open, setOpen] = useState(false);
	const selectedModelData = models.find((m) => m.id === selectedModel);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<PromptInputButton size={compact ? "icon-sm" : undefined}>
					{selectedModelData?.chefSlug && (
						<ModelSelectorLogo provider={selectedModelData.chefSlug} />
					)}
					{!compact && selectedModelData?.name && (
						<ModelSelectorName>{selectedModelData.name}</ModelSelectorName>
					)}
				</PromptInputButton>
			</PopoverTrigger>
			<PopoverContent className="w-[300px] p-0" align="start">
				<Command>
					<CommandInput placeholder="Search models..." />
					<CommandList>
						<CommandEmpty>No models found.</CommandEmpty>
						{["ZAI", "MiniMax", "OpenAI", "Anthropic", "Google"].map((chef) => (
							<CommandGroup heading={chef} key={chef}>
								{models
									.filter((m) => m.chef === chef)
									.map((m) => (
										<CommandItem
											key={m.id}
											onSelect={() => {
												if (m.id !== selectedModel) {
													onModelChange?.(m.id, selectedModel);
												}
												onSelectModel(m.id);
												setOpen(false);
											}}
											value={m.id}
										>
											<ModelSelectorLogo provider={m.chefSlug} />
											<ModelSelectorName>{m.name}</ModelSelectorName>
											{selectedModel === m.id ? (
												<CheckIcon className="ml-auto size-4" />
											) : (
												<div className="ml-auto size-4" />
											)}
										</CommandItem>
									))}
							</CommandGroup>
						))}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
