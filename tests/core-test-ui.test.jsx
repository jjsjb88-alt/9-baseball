/**
 * @vitest-environment happy-dom
 */

import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import BaseballSim from "../BaseballSim-deck-5.jsx";

vi.mock("tone", () => ({}));

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("CORE TEST UI", () => {
  it("enters the player at-bat directly from role selection", () => {
    render(<BaseballSim />);

    fireEvent.click(screen.getByRole("button", { name: "건너뛰기" }));

    expect(screen.getByRole("button", { name: /CORE TEST · 한 타석/ })).toBeTruthy();
    expect(screen.getByText("이 기기에 저장된 테스트 0/3")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /CORE TEST · 한 타석/ }));

    expect(screen.getByText("코어 테스트 — 한 타석에서 투수의 의도를 읽어 보세요")).toBeTruthy();
    expect(screen.getByAltText("상대 투수")).toBeTruthy();
    expect(screen.getByText("① 카드 선택")).toBeTruthy();
  });
});
