import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "@/components/ui";

describe("Button", () => {
  it("renders its label and responds to clicks", async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Start assessment</Button>);

    const button = screen.getByRole("button", { name: "Start assessment" });
    await userEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("is disabled when the disabled prop is passed", () => {
    render(<Button disabled>Start assessment</Button>);

    expect(screen.getByRole("button", { name: "Start assessment" })).toBeDisabled();
  });
});
