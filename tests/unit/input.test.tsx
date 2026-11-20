import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Input } from "@/components/ui";

describe("Input", () => {
  it("associates its label with the input for accessibility", () => {
    render(<Input label="Email" />);

    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("marks the field invalid and links the error message when errorMessage is set", () => {
    render(<Input label="Email" errorMessage="Enter a valid email address" />);

    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Enter a valid email address")).toBeInTheDocument();
  });
});
