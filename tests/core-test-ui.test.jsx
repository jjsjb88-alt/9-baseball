/**
 * @vitest-environment happy-dom
 */

import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import BaseballSim from "../BaseballSim-deck-5.jsx";

vi.mock("tone", () => ({}));

afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
  window.localStorage.clear();
});

const enterCoreTest = () => {
  fireEvent.click(screen.getByRole("button", { name: "건너뛰기" }));
  fireEvent.click(screen.getByRole("button", { name: /CORE TEST · 한 타석/ }));
};

const takeNextPitch = async () => {
  const takeButton = await waitFor(
    () => {
      const button = screen.getByRole("button", { name: "지켜보기" });
      expect(button.disabled).toBe(false);
      return button;
    },
    { timeout: 2_500 },
  );
  fireEvent.click(takeButton);
};

const startNextPitch = async () => {
  const button = await waitFor(
    () => {
      const nextPitch = screen.getByRole("button", { name: "다음투구" });
      expect(nextPitch.disabled).toBe(false);
      return nextPitch;
    },
    { timeout: 2_500 },
  );
  fireEvent.click(button);
};

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

  it("saves a completed at-bat, restarts for the next player, and downloads JSON", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => (
      window.setTimeout(() => callback(Date.now()), 16)
    ));
    const createObjectURL = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:core-test-results");
    const revokeObjectURL = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const downloadedNames = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function click() {
      downloadedNames.push(this.download);
    });

    const firstRender = render(<BaseballSim />);
    enterCoreTest();

    for (let pitch = 0; pitch < 4; pitch += 1) {
      await takeNextPitch();
      if (pitch < 3) {
        await startNextPitch();
      }
    }

    expect(await screen.findByText("한 타석 완료")).toBeTruthy();
    screen.getAllByRole("button", { name: "예" }).forEach((button) => fireEvent.click(button));
    fireEvent.change(screen.getByPlaceholderText("기억에 남은 선택이나 헷갈린 점 (선택)"), {
      target: { value: "다음 공도 노리고 싶었다" },
    });
    fireEvent.click(screen.getByRole("button", { name: "결과 저장" }));

    expect(screen.getByText("기록 완료")).toBeTruthy();
    expect(screen.getByText("이 기기의 코어 테스트 1/3")).toBeTruthy();
    expect(JSON.parse(window.localStorage.getItem("9zone-core-test-results-v1"))).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "다음 플레이어" }));
    expect(screen.queryByText("기록 완료")).toBeNull();
    expect(screen.getByText("코어 테스트 — 한 타석에서 투수의 의도를 읽어 보세요")).toBeTruthy();

    firstRender.unmount();
    render(<BaseballSim />);
    fireEvent.click(screen.getByRole("button", { name: "건너뛰기" }));
    expect(screen.getByText("이 기기에 저장된 테스트 1/3")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "JSON 받기" }));
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(downloadedNames).toEqual([`9zone-core-test-${new Date().toISOString().slice(0, 10)}.json`]);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:core-test-results");
  }, 20_000);
});
