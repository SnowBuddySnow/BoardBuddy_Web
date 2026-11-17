// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({ update: vi.fn() }));
vi.mock("../../services/crew", () => ({
  updateReservationManagement: api.update,
}));
import ReservationMemberDetail from "./ReservationMemberDetail";
let root: ReturnType<typeof createRoot>, container: HTMLDivElement;
beforeEach(() => {
  vi.resetAllMocks();
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
const member = {
  reservationId: 77,
  participantName: "테스트 부원",
  participantAccountId: 2,
  status: "CONFIRMED",
  paymentStatus: "UNPAID" as const,
  managerMemo: null,
};
const render = async (guest: boolean, canManage = true) => {
  const saved = vi.fn();
  await act(async () =>
    root.render(
      <ReservationMemberDetail
        crewId={17}
        date="2026-11-15"
        member={{
          ...member,
          ...(guest ? { guestId: 5, participantName: "테스트 게스트" } : {}),
        }}
        canManage={canManage}
        onSaved={saved}
        onClose={vi.fn()}
        onDelete={vi.fn()}
      />,
    ),
  );
  return saved;
};
it("shows payment controls only for managed guests", async () => {
  await render(false);
  expect(container.querySelector("select")).toBeNull();
  await render(true, false);
  expect(container.querySelector("select")).toBeNull();
  expect(container.querySelector("textarea")).toBeNull();
  await render(true);
  expect(container.querySelector("select")).not.toBeNull();
});
it("keeps a guest payment draft after failure and saves only on explicit retry", async () => {
  const saved = await render(true);
  api.update
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce({ paymentStatus: "PAID", managerMemo: null });
  const field = container.querySelector("select")!;
  await act(async () => {
    field.value = "PAID";
    field.dispatchEvent(new Event("change", { bubbles: true }));
  });
  const save = () =>
    Array.from(container.querySelectorAll("button")).find(
      (node) => node.textContent === "관리 정보 저장",
    )!;
  await act(async () => save().click());
  expect(field.value).toBe("PAID");
  expect(saved).not.toHaveBeenCalled();
  await act(async () => save().click());
  expect(api.update).toHaveBeenLastCalledWith(17, 77, "PAID", null);
  expect(saved).toHaveBeenCalledWith({
    paymentStatus: "PAID",
    managerMemo: null,
  });
});
