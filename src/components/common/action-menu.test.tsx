// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ActionMenu } from "./index";

afterEach(cleanup);

describe("ActionMenu", () => {
  it("opens from its labeled summary and runs the chosen action", () => {
    const onDetails = vi.fn();
    const onConfigure = vi.fn();
    const { container } = render(<ActionMenu onDetails={onDetails} onConfigure={onConfigure} />);
    const menu = container.querySelector("details") as HTMLDetailsElement;
    expect(menu.open).toBe(false);

    fireEvent.click(screen.getByLabelText("Acciones"));
    expect(menu.open).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Configurar" }));
    expect(onConfigure).toHaveBeenCalledTimes(1);
    expect(onDetails).not.toHaveBeenCalled();
  });
});
