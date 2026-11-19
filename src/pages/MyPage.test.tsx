// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
const user = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("../services/user", () => ({ getUserInfo: user.get }));
import MyPage from "./MyPage";
let root: ReturnType<typeof createRoot>;
let container: HTMLDivElement;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});
it.each([
  ["CREW_CAPTAIN", "크루장"],
  ["CREW_MANAGER", "임원진"],
  ["CREW_MEMBER", "부원"],
])("shows the server crew role %s as %s", async (role, label) => {
  user.get.mockResolvedValue({
    name: "김버디",
    role,
    crew: { crewId: 17, crewName: "테스트 크루" },
    profileImageUrl: null,
  });
  await act(async () =>
    root.render(<MyPage onBack={vi.fn()} seasonAvailable={false} />),
  );
  expect(container.querySelector("h1")?.textContent).toBe("내 정보");
  expect(container.textContent).toContain(label);
  expect(container.textContent).toContain("테스트 크루");
  expect(container.querySelector('[data-buddy-variant="face"]')).toBeTruthy();
});
it("does not label a user without a crew as a crew manager", async () => {
  user.get.mockResolvedValue({
    name: "김버디",
    role: "CREW_CAPTAIN",
    crew: null,
  });
  await act(async () =>
    root.render(<MyPage onBack={vi.fn()} seasonAvailable={false} />),
  );
  expect(container.textContent).toContain("크루 미가입");
  expect(container.textContent).not.toContain("크루장");
});
