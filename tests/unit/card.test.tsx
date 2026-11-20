import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Card } from "@/components/ui";

describe("Card", () => {
  it("renders its children", () => {
    render(
      <Card>
        <p>Design system preview</p>
      </Card>,
    );

    expect(screen.getByText("Design system preview")).toBeInTheDocument();
  });
});
