import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProgressBar } from "@/components/ui";

describe("ProgressBar", () => {
  it("exposes its value via ARIA attributes", () => {
    render(<ProgressBar value={30} label="Question 9 of 30" />);

    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "30");
    expect(screen.getByText("Question 9 of 30")).toBeInTheDocument();
  });

  it("clamps out-of-range values into 0-100", () => {
    render(<ProgressBar value={150} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  });
});
