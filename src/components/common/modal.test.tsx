// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useModal } from "../../hooks";
import { Modal } from "./index";

function Harness() {
  const modal = useModal();
  return (
    <>
      <button onClick={modal.openModal}>Abrir</button>
      <Modal open={modal.open} title="Prueba" onClose={modal.closeModal}>
        <input aria-label="Nombre" />
        <button>Guardar</button>
      </Modal>
    </>
  );
}

afterEach(cleanup);

describe("Modal focus management", () => {
  it("moves focus into the dialog when it opens", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Abrir" }));
    expect(document.activeElement?.getAttribute("aria-label")).toBe("Cerrar");
  });

  it("closes on Escape and returns focus to the trigger", () => {
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Abrir" });
    trigger.focus();
    fireEvent.click(trigger);
    fireEvent.keyDown(document.activeElement as Element, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("returns focus to a button clicked with the mouse when the browser did not focus it (Safari)", () => {
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Abrir" });
    fireEvent.pointerDown(trigger);
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.keyDown(document.activeElement as Element, { key: "Escape" });
    expect(document.activeElement).toBe(trigger);
  });

  it("wraps Tab from the last control to the first", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Abrir" }));
    const last = screen.getByRole("button", { name: "Guardar" });
    last.focus();
    fireEvent.keyDown(last, { key: "Tab" });
    expect(document.activeElement?.getAttribute("aria-label")).toBe("Cerrar");
  });

  it("wraps Shift+Tab from the first control to the last", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Abrir" }));
    const first = document.activeElement as Element;
    fireEvent.keyDown(first, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Guardar" }));
  });
});
