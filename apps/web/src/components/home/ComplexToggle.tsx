import { useState } from "react";
import { Switch } from "@headlessui/react";

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export default function ComplexToggle({
  setIsSummary,
  isSummary,
}: {
  setIsSummary: (value: boolean) => void;
  isSummary: boolean;
}) {
  return (
    <Switch.Group as="div" className="flex items-center">
      <Switch.Label as="span" className="mr-3 text-sm">
        <span
          className={`text-gray-900 ${
            !isSummary ? "font-bold" : "font-medium"
          }`}
        >
          Original Note
        </span>{" "}
      </Switch.Label>
      <Switch
        checked={isSummary}
        onChange={setIsSummary}
        className={classNames(
          isSummary ? "bg-primary" : "bg-gray-200",
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ",
        )}
      >
        <span
          aria-hidden="true"
          className={classNames(
            isSummary ? "translate-x-5" : "translate-x-0",
            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out",
          )}
        />
      </Switch>
      <Switch.Label as="span" className="ml-3 text-sm">
        <span
          className={`text-gray-900 ${isSummary ? "font-bold" : "font-medium"}`}
        >
          AI Summary
        </span>{" "}
      </Switch.Label>
    </Switch.Group>
  );
}
