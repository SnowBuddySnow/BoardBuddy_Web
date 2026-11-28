// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({ get: vi.fn(), save: vi.fn() }));
vi.mock("../../services/seasonStays", () => ({
  getSeasonPass: api.get,
  saveSeasonPass: api.save,
}));
import SeasonPassEditor from "./SeasonPassEditor";
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
  api.get.mockResolvedValue(pass);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});
const button = (label: string) =>
  Array.from(container.querySelectorAll("button")).find(
    (node) => node.textContent?.trim() === label,
  )!;
const render = async (id = 1) =>
  act(async () =>
    root.render(
      <SeasonPassEditor crewId={17} memberId={id} onSaved={vi.fn()} />,
    ),
  );
it("discards a canceled edit and refreshes the authoritative summary after save", async () => {
  await render();
  await act(async () => button("이용권 수정").click());
  const change = async (value: string) =>
    act(async () => {
      const kind = container.querySelector(
        '[aria-label="이용권 종류"]',
      ) as HTMLSelectElement;
      kind.value = value;
      kind.dispatchEvent(new Event("change", { bubbles: true }));
    });
  await change("10");
  await act(async () => button("수정 취소").click());
  await act(async () => button("이용권 수정").click());
  expect(
    (container.querySelector('[aria-label="이용권 종류"]') as HTMLSelectElement)
      .value,
  ).toBe("5");
  await change("10");
  api.save.mockResolvedValue({
    ...pass,
    name: "10박권",
    totalNights: 10,
    remainingNights: 8,
  });
  await act(async () => button("이용권 저장").click());
  expect(api.save).toHaveBeenCalledWith(
    17,
    1,
    { name: "10박권", totalNights: 10 },
  );
  expect(container.textContent).toContain("10박권");
});
it("clears the previous member balance before a new lookup finishes", async () => {
  await render();
  api.get.mockImplementationOnce(() => new Promise(() => {}));
  await render(2);
  expect(
    container.querySelector('[aria-label="선택한 부원 이용권"]'),
  ).toBeNull();
});
