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

  it("closes another open menu when a menu is opened", () => {
    const { container } = render(
      <>
        <ActionMenu onDetails={vi.fn()} />
        <ActionMenu onDetails={vi.fn()} />
      </>,
    );
    const menus = Array.from(container.querySelectorAll("details")) as HTMLDetailsElement[];
    const summaries = screen.getAllByLabelText("Acciones");

    fireEvent.click(summaries[0]);
    expect(menus[0].open).toBe(true);

    fireEvent.click(summaries[1]);
    expect(menus[0].open).toBe(false);
    expect(menus[1].open).toBe(true);
  });

  it("closes when clicking outside the menu", () => {
    const { container } = render(
      <>
        <ActionMenu onDetails={vi.fn()} />
        <button>Fuera</button>
      </>,
    );
    const menu = container.querySelector("details") as HTMLDetailsElement;

    fireEvent.click(screen.getByLabelText("Acciones"));
    expect(menu.open).toBe(true);

    fireEvent.pointerDown(screen.getByRole("button", { name: "Fuera" }));
    expect(menu.open).toBe(false);
  });
});
