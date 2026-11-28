// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({
  list: vi.fn(),
  assign: vi.fn(),
  get: vi.fn(),
  history: vi.fn(),
  save: vi.fn(),
}));
vi.mock("../../services/seasonStays", () => ({
  listSeasonPassMembers: api.list,
  assignSeasonPasses: api.assign,
  getSeasonPass: api.get,
  getMemberStayHistory: api.history,
  saveSeasonPass: api.save,
}));
import SeasonPassManager from "./SeasonPassManager";
let root: ReturnType<typeof createRoot>, container: HTMLDivElement;
const pass = {
  registered: true,
  name: "5박권",
  totalNights: 5,
  usedNights: 1,
  reservedNights: 1,
  remainingNights: 3,
  startsOn: "2026-10-01",
  endsOn: "2027-03-31",
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  api.list.mockResolvedValue({
    items: [
      {
        accountId: 1,
        name: "김버디",
        role: "CREW_MEMBER",
        studentNumber: "20260001",
        pass,
        completedNights: 1,
      },
      {
        accountId: 2,
        name: "이눈꽃",
        role: "CREW_MEMBER",
        studentNumber: "20260002",
        pass,
        completedNights: 1,
      },
    ],
    total: 2,
    page: 0,
    size: 30,
  });
  api.get.mockResolvedValue(pass);
  api.history.mockResolvedValue({
    items: [
      {
        reservationId: 3,
        date: "2026-11-12",
        status: "CONFIRMED",
        completed: true,
      },
    ],
    total: 1,
    page: 0,
    size: 10,
  });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
const render = async () =>
  act(async () => root.render(<SeasonPassManager crewId={17} />));
const button = (label: string) =>
  Array.from(container.querySelectorAll("button")).find(
    (node) => node.textContent?.trim() === label,
  )!;
it("shows every member balance without a dropdown and loads only an opened member history", async () => {
  await render();
  expect(container.textContent).toContain("김버디");
  expect(container.textContent).toContain("이눈꽃");
  expect(container.querySelector("select")).toBeNull();
  expect(api.history).not.toHaveBeenCalled();
  await act(async () =>
    (
      container.querySelector(
        '[aria-label="김버디 이력·수정"]',
      ) as HTMLButtonElement
    ).click(),
  );
  expect(api.history).toHaveBeenCalledWith(17, 1, 0);
  expect(container.querySelector('[role="dialog"]')?.textContent).toContain(
    "2026.11.12",
  );
});
it("keeps bulk selection after a rejected assignment and retries the same members explicitly", async () => {
  await render();
  await act(async () =>
    (
      container.querySelector(
        '[aria-label="현재 목록 전체 선택"]',
      ) as HTMLInputElement
    ).click(),
  );
  await act(async () => button("풀상주 할당").click());
  api.assign
    .mockRejectedValueOnce(new Error("quota"))
    .mockResolvedValueOnce({ updated: 2 });
  await act(async () => button("선택 2명에게 할당").click());
  expect(container.querySelector('[role="dialog"]')).not.toBeNull();
  await act(async () => button("선택 2명에게 할당").click());
  expect(api.assign).toHaveBeenCalledWith(
    17,
    [1, 2],
    { name: "풀상주권", totalNights: null },
  );
  expect(container.querySelector('[role="dialog"]')).toBeNull();
  expect(container.textContent).toContain("2명에게 이용권을 할당했습니다.");
});
it("debounces member search and clears the prior selection", async () => {
  vi.useFakeTimers();
  await render();
  await act(async () =>
    (
      container.querySelector(
        '[aria-label="현재 목록 전체 선택"]',
      ) as HTMLInputElement
    ).click(),
  );
  const search = container.querySelector(
    '[aria-label="부원 검색"]',
  ) as HTMLInputElement;
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(search, "이눈꽃");
    search.dispatchEvent(new Event("input", { bubbles: true }));
  });
  expect(container.textContent).toContain("0명 선택");
  await act(async () => vi.advanceTimersByTime(300));
  expect(api.list).toHaveBeenLastCalledWith(17, "이눈꽃", 0);
});
