import { Button } from "@answeroverflow/reacord";
import React from "react";

export function Counter({ initalCount }: { initalCount: number }) {
  const [count, setCount] = React.useState(initalCount);
  return (
    <>
      count: {count}
      <Button label="+1" onClick={() => setCount((prevCount) => prevCount + 1)} />
      <Button label="-1" onClick={() => setCount((prevCount) => prevCount - 1)} />
      <Button label="reset" onClick={() => setCount(initalCount)} />
    </>
  );
}
