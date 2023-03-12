import { Embed } from "@answeroverflow/discordjs-react";
import { ANSWER_OVERFLOW_BLUE_AS_INT } from "@answeroverflow/constants";
import React from "react";
export const InstructionsContainer = ({ children }: { children: React.ReactNode }) => (
	<Embed color={ANSWER_OVERFLOW_BLUE_AS_INT}>{children}</Embed>
);
