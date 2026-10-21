// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useForm, useModal } from "./index";

afterEach(cleanup);

describe("useModal", () => {
  it("opens and closes", () => {
    const { result } = renderHook(() => useModal());
    expect(result.current.open).toBe(false);

    act(() => result.current.openModal());
    expect(result.current.open).toBe(true);

    act(() => result.current.closeModal());
    expect(result.current.open).toBe(false);
  });
});

describe("useForm", () => {
  it("replaces the form state", () => {
    const { result } = renderHook(() => useForm({ name: "", amount: "0" }));
    expect(result.current.form).toEqual({ name: "", amount: "0" });

    act(() => result.current.setForm({ name: "Caja", amount: "0" }));
    expect(result.current.form).toEqual({ name: "Caja", amount: "0" });
  });
});
