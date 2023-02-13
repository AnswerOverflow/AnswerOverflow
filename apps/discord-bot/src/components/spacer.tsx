import React from "react";

export const Spacer = ({ count = 1 }: { count?: number }) => (
  <>
    {Array.from({ length: count }).map(() => (
      <>{"\n"}</>
    ))}
  </>
);
