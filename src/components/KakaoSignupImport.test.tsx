// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import {
  getAccountId,
  getSignupToken,
  saveAccountId,
  saveTempAccessToken,
} from "../lib/session";
import { getSignupPrefill } from "../lib/signupPrefill";
import { kakaoSignupScopes } from "../lib/kakaoScopes";
const post = vi.hoisted(() => vi.fn());
vi.mock("../lib/axios", () => ({ default: { post } }));
import KakaoSignupImport from "./KakaoSignupImport";
let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
const imported = vi.fn();
const login = vi.fn();
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.resetAllMocks();
  localStorage.clear();
  saveAccountId(42);
  saveTempAccessToken("existing-temp");
  vi.stubGlobal("Kakao", { isInitialized: () => true, Auth: { login } });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});
const render = async () => {
  await act(async () =>
    root.render(
      <KakaoSignupImport
        scopes={["name", "gender", "friends", "name"]}
        onImported={imported}
      />,
    ),
  );
};
it("imports only consented fields for the same pending account and stores no provider PII", async () => {
  post.mockResolvedValue({
    data: {
      data: {
        accountId: 42,
        status: "PENDING_PROFILE",
        accessToken: "new-temp",
        signupPrefill: {
          name: "테스트 이름",
          gender: "FEMALE",
          missingConsentScopes: [],
        },
      },
    },
  });
  await render();
  await act(async () => container.querySelector("button")!.click());
  expect(login.mock.calls[0][0].scope).toBe("name,gender");
  await act(async () =>
    login.mock.calls[0][0].success({ access_token: "provider-token" }),
  );
  expect(imported).toHaveBeenCalledWith(
    expect.objectContaining({ name: "테스트 이름", gender: "FEMALE" }),
  );
  expect(getSignupPrefill().gender).toBe("FEMALE");
  expect(JSON.stringify(localStorage)).not.toContain("테스트 이름");
  expect(getSignupToken()).toBe("new-temp");
});
it("keeps the form identity if a different Kakao account is chosen", async () => {
  post.mockResolvedValue({
    data: {
      data: {
        accountId: 99,
        status: "PENDING_PROFILE",
        accessToken: "other-temp",
        signupPrefill: { name: "다른 사람" },
      },
    },
  });
  await render();
  await act(async () => container.querySelector("button")!.click());
  await act(async () =>
    login.mock.calls[0][0].success({ access_token: "provider-token" }),
  );
  expect(imported).not.toHaveBeenCalled();
  expect(getAccountId()).toBe("42");
  expect(getSignupToken()).toBe("existing-temp");
  expect(container.textContent).toContain("직접 입력");
});
it("allows manual input after additional consent is declined", async () => {
  await render();
  await act(async () => container.querySelector("button")!.click());
  await act(async () => login.mock.calls[0][0].fail({ error: "denied" }));
  expect(container.querySelector("button")!.disabled).toBe(false);
  expect(imported).not.toHaveBeenCalled();
  expect(container.textContent).toContain("직접 입력");
});
it("filters deployment scopes to supported signup data only", () => {
  expect(kakaoSignupScopes("name, gender,phone_number,friends,name")).toBe(
    "name,gender,phone_number",
  );
  expect(kakaoSignupScopes("")).toBeUndefined();
});
