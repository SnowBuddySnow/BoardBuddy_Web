// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({
  user: vi.fn(),
  list: vi.fn(),
  grant: vi.fn(),
  revoke: vi.fn(),
}));
vi.mock("../services/user", () => ({ getUserInfo: api.user }));
vi.mock("../services/crewPermissions", () => ({
  listCrewMemberAccess: api.list,
  grantCrewManager: api.grant,
  revokeCrewManager: api.revoke,
}));
import CrewPermissions from "./CrewPermissions";
let root: ReturnType<typeof createRoot>, container: HTMLDivElement;
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  api.user.mockResolvedValue({ role: "CREW_MANAGER", crew: { crewId: 17 } });
  api.list.mockResolvedValue([
    {
      accountId: 2,
      displayName: "부원",
      crewRole: "CREW_MEMBER",
    },
  ]);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});
it("keeps manager role assignments read-only while allowing the pass section", async () => {
  await act(async () =>
    root.render(<CrewPermissions onBack={vi.fn()} canAssignRoles={false} />),
  );
  const buttons = Array.from(container.querySelectorAll("button")).filter(
    (node) => node.textContent?.trim() === "크루 매니저",
  );
  expect(buttons).toHaveLength(1);
  expect(buttons.every((button) => button.disabled)).toBe(true);
  await act(async () => buttons.forEach((button) => button.click()));
  expect(api.grant).not.toHaveBeenCalled();
  expect(container.textContent).toContain("이용권 관리");
});
it("uses one control to grant and revoke the crew manager role", async () => {
  api.user.mockResolvedValue({ role: "CREW_CAPTAIN", crew: { crewId: 17 } });
  await act(async () =>
    root.render(<CrewPermissions onBack={vi.fn()} canAssignRoles />),
  );
  const button = Array.from(container.querySelectorAll("button")).find(
    (node) => node.textContent?.trim() === "크루 매니저",
  )!;
  expect(button.disabled).toBe(false);
  await act(async () => button.click());
  expect(api.grant).toHaveBeenCalledWith(17, 2);
  expect(button.getAttribute("aria-pressed")).toBe("true");
  await act(async () => button.click());
  expect(api.revoke).toHaveBeenCalledWith(17, 2);
  expect(button.getAttribute("aria-pressed")).toBe("false");
});
