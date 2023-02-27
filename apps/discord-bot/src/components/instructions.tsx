import React from "react";
import { Spacer } from "./spacer";

export type MenuInstruction = {
  title: string;
  instructions: string;
  enabled: boolean;
};

export const EmbedMenuInstruction = ({ instructions }: { instructions: MenuInstruction[] }) => (
  <React.Fragment>
    {instructions.map(
      ({ title, instructions, enabled }) =>
        enabled && (
          <React.Fragment key={title}>
            **{title}** - {instructions}
            <Spacer count={2} />
          </React.Fragment>
        )
    )}
  </React.Fragment>
);
