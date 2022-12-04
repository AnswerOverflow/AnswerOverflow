import { composeStories } from "@storybook/react";
import { render, screen } from "@testing-library/react";
import * as stories from "./Avatar.stories";
const { Primary, Secondary, Tertiary } = composeStories(stories);

it("renders primary", () => {
  render(<Primary />);
  expect(screen.getByText("John Doe")).toBeDefined();
});

it("renders secondary", () => {
  render(<Secondary />);
  expect(screen.getByText("El Doe")).toBeDefined();
});

it("renders tertiary", () => {
  render(<Tertiary />);
  expect(screen.getByText("Can Name")).toBeDefined();
});
