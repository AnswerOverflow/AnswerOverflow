import { Button } from "@answeroverflow/reacord";
import React from "react";

export function Counter({ inital_count }: { inital_count: number }) {
  const [count, setCount] = React.useState(inital_count);
  return (
    <>
      count: {count}
      <Button label="+1" onClick={() => setCount((prevCount) => prevCount + 1)} />
      <Button label="-1" onClick={() => setCount((prevCount) => prevCount - 1)} />
      <Button label="reset" onClick={() => setCount(inital_count)} />
    </>
  );
}
