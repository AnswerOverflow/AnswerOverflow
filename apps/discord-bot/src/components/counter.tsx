import { Button } from "@answeroverflow/reacord";
import React from "react";

export function Counter({ initialCount }: { initialCount: number }) {
  const [count, setCount] = React.useState(initialCount);
  return (
    <>
      count: {count}
      <Button label="+1" onClick={() => setCount((prevCount) => prevCount + 1)} />
      <Button label="-1" onClick={() => setCount((prevCount) => prevCount - 1)} />
      <Button label="reset" onClick={() => setCount(initialCount)} />
    </>
  );
}
