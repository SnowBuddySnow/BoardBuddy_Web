import { chromium, webkit } from "playwright";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { mkdirSync, writeFileSync } from "node:fs";
import { installOnboardingBoundary } from "./onboarding-browser-boundary.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const origin = "http://127.0.0.1:5191";
const assert = (condition, message) => {
  if (!condition) throw Error(message);
};

let server;
const completed = [];

try {
  server = spawn(
    process.execPath,
    [
      "node_modules/vite/bin/vite.js",
      "--host",
      "127.0.0.1",
      "--port",
      "5191",
      "--strictPort",
    ],
    {
      cwd: root,
      stdio: "ignore",
      env: {
        ...process.env,
        BOARDBUDDY_VITE_CACHE_DIR: "node_modules/.vite-notif-groups-test",
        VITE_API_BASE_URL: `${origin}/__scenario_api`,
        VITE_KAKAO_JAVASCRIPT_KEY: "",
      },
    },
  );

  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (server.exitCode != null) throw Error("Vite fixture exited early");
    try {
      if ((await fetch(origin)).ok) {
        ready = true;
        break;
      }
    } catch {
      // Wait for Vite startup
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert(ready, "Server not ready");
  mkdirSync(`${root}/output/playwright`, { recursive: true });

  const browserMatrix = [
    ["chromium", chromium, [320, 390, 1440]],
    ...(process.env.CI ? [["webkit", webkit, [390]]] : []),
  ];

  for (const [name, engine, widths] of browserMatrix) {
    const browser = await engine.launch({
      headless: true,
      ...(!process.env.CI && name === "chromium" ? { channel: "chrome" } : {}),
    });
    try {
      for (const width of widths) {
        const context = await browser.newContext({
          viewport: { width, height: 900 },
          isMobile: width < 1024,
          hasTouch: width < 1024,
          serviceWorkers: "block",
        });
        await context.addInitScript(() => {
          localStorage.setItem("accountId", "99101");
          localStorage.setItem("accessToken", "synthetic-active");
          localStorage.setItem(
            "boardbuddy_captain_onboarding_v1:99101",
            "completed",
          );
          localStorage.setItem("phone_sharing_consent_preference", "always");
        });

        const page = await context.newPage();
        page.on("dialog", (dialog) => dialog.accept());
        const state = await installOnboardingBoundary(page, { origin });
        state.approved = true;
        state.role = "CREW_CAPTAIN";
        state.seasonOpen = true;
        state.notifications = [
          {
            id: 501,
            type: "CREW_NOTICE",
            audienceType: "CREW",
            senderType: "MANAGER",
            title: "주말 라이딩 집합 안내",
            body: "토요일 오전 9시 리프트 앞 집합입니다.",
            actionUrl: null,
            channels: ["IN_APP"],
            publishedAt: "2026-11-13T08:00:00",
            read: false,
          },
          {
            id: 502,
            type: "SYSTEM",
            audienceType: "GLOBAL",
            senderType: "DEVELOPER",
            title: "시스템 정기 점검 완료",
            body: "정상 운영 중입니다.",
            actionUrl: null,
            channels: ["IN_APP"],
            publishedAt: "2026-11-12T18:00:00",
            read: true,
          },
        ];
        state.groups = [
          {
            id: 1,
            name: "로컬 연합 호스트",
            createdAt: "2026-11-01T10:00:00",
            myRole: "EVENT_GROUP_OWNER",
            memberCount: 2,
            crewCount: 1,
          },
        ];

        const assertNoHorizontalOverflow = async (label) =>
          assert(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
            `${name}/${width} (${label}): horizontal overflow`,
          );

        // 1. Notifications feed: unread badge -> open -> click unread -> count drops to 0
        await page.goto(`${origin}/?view=notifications`);
        await page.getByText("읽지 않은 알림 1개", { exact: true }).waitFor();
        await page.getByText("주말 라이딩 집합 안내", { exact: true }).waitFor();
        await assertNoHorizontalOverflow("notifications");

        await page.getByText("주말 라이딩 집합 안내", { exact: true }).click();
        await page.getByText("읽지 않은 알림 0개", { exact: true }).waitFor();
        assert(
          state.traffic.some(
            (req) => req.path === "/notifications/501/read" && req.method === "PATCH",
          ),
          `${name}/${width}: expected PATCH /notifications/501/read`,
        );

        // 2. Organizer groups view: displays existing host group cleanly across viewports
        await page.goto(`${origin}/?view=dashboard_groups`);
        await page.getByText("로컬 연합 호스트").first().waitFor();
        await assertNoHorizontalOverflow("dashboard_groups");

        // 3. Crew discovery view: lists discoverable crew cleanly
        await page.goto(`${origin}/?view=search_crew`);
        await page.getByText("가상 크루").first().waitFor();
        await assertNoHorizontalOverflow("search_crew");

        assert(
          state.errors.length === 0,
          `${name}/${width}: page errors: ${state.errors.join("; ")}`,
        );
        assert(
          state.unknown.length === 0,
          `${name}/${width}: unknown routes: ${JSON.stringify(state.unknown)}`,
        );

        completed.push(`${name}@${width}`);
        await context.close();
      }
    } finally {
      await browser.close();
    }
  }

  writeFileSync(
    `${root}/output/playwright/notifications-groups-summary.json`,
    JSON.stringify({ ok: true, completed }, null, 2),
  );
  console.log(`Notifications & organizer groups E2E verified: ${completed.join(", ")}`);
} finally {
  server?.kill("SIGTERM");
}
