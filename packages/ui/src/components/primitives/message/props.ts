import { MessageWithDiscordAccount } from '@answeroverflow/db';
import React from 'react';

export type MessageProps = {
	message: MessageWithDiscordAccount;
	showBorders?: boolean;
	Blurrer?: React.FC<{ children: React.ReactNode }>;
	className?: string;
	fullRounded?: boolean;
	/**
	 * If typed as true, will collapse the content if longer than default
	 * If typed as a number, will collapse the content if longer than the number
	 */
	collapseContent?: boolean | number;
	loadingStyle?: 'lazy' | 'eager';
};
