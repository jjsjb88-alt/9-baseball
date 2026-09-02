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
  delete window.storage;
});

const enterCoreTest = () => {
  fireEvent.click(screen.getByRole("button", { name: "건너뛰기" }));
  fireEvent.click(screen.getByRole("button", { name: /CORE TEST · 한 타석/ }));
};

const storedCoreTestResult = {
  version: 1,
  timestamp: "2026-09-02T01:02:03.000Z",
  answers: {
    choseLowProbability: true,
    feltLikeRead: true,
    plannedCounter: true,
    powerDominant: false,
  },
  note: "패턴을 찾았다",
  finalPlay: "볼넷",
  pitchesSeen: [{ zone: 7, pitchId: "fastball" }],
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
  it("blocks incomplete feedback exports when an individual entry fails and retries the full load", async () => {
    const storedFeedback = [
      {
        rating: 5,
        text: "첫 번째 피드백",
        role: "batter",
        timestamp: "2026-09-02T01:02:03.000Z",
      },
      {
        rating: 4,
        text: "두 번째 피드백",
        role: "pitcher",
        timestamp: "2026-09-02T02:03:04.000Z",
      },
    ];
    let loadAttempt = 0;
    window.storage = {
      list: vi.fn().mockImplementation(() => {
        loadAttempt += 1;
        return Promise.resolve({ keys: ["feedback:one", "feedback:two"] });
      }),
      get: vi.fn().mockImplementation((key) => {
        if (loadAttempt === 1 && key === "feedback:two") {
          return Promise.reject(new Error("entry blocked"));
        }
        const index = key === "feedback:one" ? 0 : 1;
        return Promise.resolve({ value: JSON.stringify(storedFeedback[index]) });
      }),
    };
    render(<BaseballSim />);

    fireEvent.click(screen.getByRole("button", { name: "건너뛰기" }));
    fireEvent.click(screen.getByRole("button", { name: "내보내기(관리자)" }));

    expect((await screen.findByRole("alert")).textContent).toContain("피드백 불러오기 실패");
    expect(screen.getByRole("button", { name: "파일로 다운로드" }).disabled).toBe(true);
    expect(screen.getByDisplayValue("").value).toBe("");

    fireEvent.click(screen.getByRole("button", { name: "다시 불러오기" }));

    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    expect(screen.getByText("2건 수집됨")).toBeTruthy();
    expect(screen.getByDisplayValue(/첫 번째 피드백/).value).toContain("두 번째 피드백");
    expect(screen.getByRole("button", { name: "파일로 다운로드" }).disabled).toBe(false);
    expect(window.storage.list).toHaveBeenCalledTimes(2);
    expect(window.storage.get.mock.calls.filter(([key]) => key.startsWith("feedback:")).length).toBe(4);
  });

  it("shows feedback load failures in the export panel and retries without offering invalid JSON", async () => {
    const storedFeedback = {
      rating: 5,
      text: "투수의 패턴을 읽는 순간이 좋았다",
      role: "batter",
      timestamp: "2026-09-02T01:02:03.000Z",
    };
    const list = vi.fn()
      .mockRejectedValueOnce(new Error("storage blocked"))
      .mockResolvedValueOnce({ keys: ["feedback:one"] });
    window.storage = {
      list,
      get: vi.fn().mockResolvedValue({ value: JSON.stringify(storedFeedback) }),
    };
    render(<BaseballSim />);

    fireEvent.click(screen.getByRole("button", { name: "건너뛰기" }));
    fireEvent.click(screen.getByRole("button", { name: "내보내기(관리자)" }));

    expect((await screen.findByRole("alert")).textContent).toContain("피드백 불러오기 실패");
    expect(screen.getByRole("button", { name: "파일로 다운로드" }).disabled).toBe(true);
    expect(screen.queryByDisplayValue("불러오기 실패")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "다시 불러오기" }));

    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    expect(screen.getByText("1건 수집됨")).toBeTruthy();
    expect(screen.getByDisplayValue(/투수의 패턴을 읽는 순간이 좋았다/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "파일로 다운로드" }).disabled).toBe(false);
    expect(list).toHaveBeenCalledTimes(2);
  });

  it("shows feedback download failures in the export panel and retries without losing data", async () => {
    const storedFeedback = {
      rating: 5,
      text: "투수의 패턴을 읽는 순간이 좋았다",
      role: "batter",
      timestamp: "2026-09-02T01:02:03.000Z",
    };
    window.storage = {
      list: vi.fn().mockResolvedValue({ keys: ["feedback:one"] }),
      get: vi.fn().mockResolvedValue({ value: JSON.stringify(storedFeedback) }),
    };
    const createObjectURL = vi.spyOn(URL, "createObjectURL")
      .mockReturnValueOnce("blob:failed-feedback")
      .mockReturnValueOnce("blob:feedback");
    const revokeObjectURL = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const downloadedNames = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementationOnce(() => { throw new Error("downloads blocked"); })
      .mockImplementation(function click() {
        downloadedNames.push(this.download);
      });
    render(<BaseballSim />);

    fireEvent.click(screen.getByRole("button", { name: "건너뛰기" }));
    fireEvent.click(screen.getByRole("button", { name: "내보내기(관리자)" }));
    await screen.findByText("1건 수집됨");

    fireEvent.click(screen.getByRole("button", { name: "파일로 다운로드" }));

    expect(screen.getByRole("alert").textContent).toContain("피드백 다운로드 실패");
    expect(screen.getByDisplayValue(/투수의 패턴을 읽는 순간이 좋았다/)).toBeTruthy();
    expect(downloadedNames).toEqual([]);
    expect(document.body.querySelector("a[download]")).toBeNull();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:failed-feedback");

    fireEvent.click(screen.getByRole("button", { name: "파일로 다운로드" }));

    expect(screen.queryByRole("alert")).toBeNull();
    expect(createObjectURL).toHaveBeenCalledTimes(2);
    expect(downloadedNames).toHaveLength(1);
    expect(downloadedNames[0]).toMatch(/^9zone-feedback-\d+\.json$/);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:feedback");
    expect(document.body.querySelector("a[download]")).toBeNull();
  });

  it("shows feedback save failures in the open modal and retries without losing input", async () => {
    const set = vi.fn()
      .mockRejectedValueOnce(new Error("storage blocked"))
      .mockResolvedValueOnce(undefined);
    window.storage = { set };
    render(<BaseballSim />);

    fireEvent.click(screen.getByRole("button", { name: "건너뛰기" }));
    fireEvent.click(screen.getByRole("button", { name: /피드백/ }));
    fireEvent.click(screen.getAllByRole("button", { name: "⭐" })[4]);
    const feedback = screen.getByPlaceholderText("재밌었던 점, 아쉬운 점, 헷갈렸던 부분 등 자유롭게...");
    fireEvent.change(feedback, { target: { value: "패턴을 읽는 순간이 좋았다" } });

    fireEvent.click(screen.getByRole("button", { name: "제출" }));

    expect((await screen.findByRole("alert")).textContent).toContain("피드백 저장 실패");
    expect(feedback.value).toBe("패턴을 읽는 순간이 좋았다");
    expect(screen.getAllByRole("button", { name: "⭐" })[4].className).toContain("scale-110");

    fireEvent.click(screen.getByRole("button", { name: "제출" }));

    expect(await screen.findByText("고마워요!")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(set).toHaveBeenCalledTimes(2);
  });

  it("reports a failed initial result load and restores the count on retry", () => {
    window.localStorage.setItem("9zone-core-test-results-v1", JSON.stringify([storedCoreTestResult]));
    vi.spyOn(window.localStorage, "getItem")
      .mockImplementationOnce(() => { throw new Error("storage blocked"); });

    render(<BaseballSim />);
    fireEvent.click(screen.getByRole("button", { name: "건너뛰기" }));

    expect(screen.getByRole("alert").textContent).toContain("저장 결과 불러오기 실패");
    expect(screen.getByText("이 기기에 저장된 테스트 0/3")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "다시 불러오기" }));

    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText("이 기기에 저장된 테스트 1/3")).toBeTruthy();
  });

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

  it("reports a failed save, retries, restarts for the next player, and downloads JSON", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => (
      window.setTimeout(() => callback(Date.now()), 16)
    ));
    const createObjectURL = vi.spyOn(URL, "createObjectURL")
      .mockReturnValueOnce("blob:failed-core-test-results")
      .mockReturnValue("blob:core-test-results");
    const revokeObjectURL = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const downloadedNames = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementationOnce(() => { throw new Error("downloads blocked"); })
      .mockImplementation(function click() {
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

    const setItem = vi.spyOn(window.localStorage, "setItem")
      .mockImplementationOnce(() => { throw new Error("storage blocked"); });
    fireEvent.click(screen.getByRole("button", { name: "결과 저장" }));

    expect(screen.getByRole("alert").textContent).toContain("결과 저장 실패");
    expect(screen.queryByText("기록 완료")).toBeNull();

    setItem.mockRestore();
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
    expect(screen.getByRole("alert").textContent).toContain("JSON 내보내기 실패");
    expect(downloadedNames).toEqual([]);
    expect(document.body.querySelector("a[download]")).toBeNull();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:failed-core-test-results");

    fireEvent.click(screen.getByRole("button", { name: "JSON 받기" }));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(createObjectURL).toHaveBeenCalledTimes(2);
    expect(downloadedNames).toEqual([`9zone-core-test-${new Date().toISOString().slice(0, 10)}.json`]);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:core-test-results");
    expect(document.body.querySelector("a[download]")).toBeNull();
  }, 20_000);
});
