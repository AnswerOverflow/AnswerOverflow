import { Button } from "ui";
import {add} from "core";

export default function Web() {
  return (
    <div>
      <h1>WeeeN {add(1,10)}</h1>
      <Button />
    </div>
  );
}
