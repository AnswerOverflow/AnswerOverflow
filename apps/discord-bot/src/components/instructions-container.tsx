import { Embed } from "@answeroverflow/reacord";
import { ANSWER_OVERFLOW_BLUE_AS_INT } from "~discord-bot/utils/constants";
import React from "react";
export const InstructionsContainer = ({ children }: { children: React.ReactNode }) => (
  <Embed color={ANSWER_OVERFLOW_BLUE_AS_INT}>{children}</Embed>
);
