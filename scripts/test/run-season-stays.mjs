import { chromium, webkit } from "playwright";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { mkdirSync, writeFileSync } from "node:fs";
import { installOnboardingBoundary } from "./onboarding-browser-boundary.mjs";
const root = fileURLToPath(new URL("../../", import.meta.url));
const origin = "http://127.0.0.1:5190";
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
      "5190",
      "--strictPort",
    ],
    {
      cwd: root,
      stdio: "ignore",
      env: {
        ...process.env,
        BOARDBUDDY_VITE_CACHE_DIR: 'node_modules/.vite-stays-test',
        VITE_API_BASE_URL: `${origin}/__scenario_api`,
        VITE_KAKAO_JAVASCRIPT_KEY: "",
      },
    },
  );
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (server.exitCode != null) throw Error("Fixture exited");
    try {
      if ((await fetch(origin)).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert(ready, "Server not ready");
  mkdirSync(`${root}/output/playwright`, { recursive: true });
  for (const [name, engine, widths] of [
    ["chromium", chromium, [320, 390, 1440]],
    ["webkit", webkit, [390]],
  ]) {
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
        state.seasonPasses[99101] = {
          registered: true,
          name: "5박권",
          startsOn: "2026-10-01",
          endsOn: "2027-05-31",
          totalNights: 5,
        };
        state.bookings = [
          {
            date: "2026-11-12",
            reservationId: 80,
            participantAccountId: 99101,
            status: "CONFIRMED",
            stayCompleted: true,
          },
          {
            date: "2026-11-14",
            reservationId: 81,
            participantAccountId: 99101,
            status: "CONFIRMED",
          },
          {
            date: "2026-11-15",
            reservationId: 82,
            participantAccountId: 99101,
            status: "WAITING",
            waitlistPosition: 3,
          },
        ];
        state.nextBookingId = 90;
        const fits = async () =>
          assert(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
            `${name}/${width}: horizontal overflow`,
          );
        const day = (n) =>
          page.getByRole("button", { name: `2026년 11월 ${n}일`, exact: true });
        await page.goto(`${origin}/?view=my_reservations`);
        await page.getByText("추가 예약 3박 가능", { exact: true }).waitFor();
        await page
          .getByRole("region", { name: "내 시즌방 이용권" })
          .getByText("이용 완료", { exact: true })
          .waitFor();
        await fits();
        await day(13).click();
        const personalApply = page
          .locator(".reservation-content")
          .getByRole("button", { name: "예약하기", exact: true });
        assert(
          await personalApply.isDisabled(),
          "Personal booking bypassed consent",
        );
        await page
          .getByRole("checkbox", {
            name: "숙박일 기준을 확인하고 동의합니다. *",
            exact: true,
          })
          .check();
        await personalApply.click();
        await page
          .getByText("예약이 확정되었습니다.", { exact: true })
          .waitFor();
        assert(
          state.writes.at(-1).body.stayPolicyVersion === 1,
          "Policy version missing",
        );
        await page.goto(`${origin}/?view=season_calendar`);
        await day(16).click();
        const apply = page
          .locator(".reservation-content")
          .getByRole("button", { name: "예약하기", exact: true });
        assert(await apply.isDisabled(), "Crew booking bypassed consent");
        await page
          .getByRole("checkbox", {
            name: "숙박일 기준을 확인하고 동의합니다. *",
            exact: true,
          })
          .check();
        await apply.click();
        await page
          .getByRole("button", { name: "예약 취소하기", exact: true })
          .waitFor();
        await fits();
        await day(13).click();
        await page.getByRole("button",{name:"공지하기",exact:true}).click();
        const panel = page.getByRole("region", { name: "숙박자 공지" });
        await panel
          .getByRole("textbox", { name: "숙박 공지 내용" })
          .fill("입실 후 청소 분담을 확인해 주세요.");
        await panel
          .getByRole("button", { name: "확정 숙박자에게 보내기", exact: true })
          .click();
        await panel
          .getByText("2명의 서비스 알림함에 공지를 보냈습니다.", {
            exact: true,
          })
          .waitFor();
        await panel.getByText("읽음 0/2", { exact: true }).waitFor();
        assert(
          state.stayAnnouncements.length === 1,
          "Announcement double sent",
        );
        assert(await page.getByText('부원 이용권 관리',{exact:true}).count()===0,'Booking calendar contains pass administration');
        await page.goto(`${origin}/?view=crew_detail`);
        await page.getByRole('button',{name:'이용권 관리',exact:true}).click();
        await page.getByRole('heading',{name:'크루 관리',exact:true}).waitFor();
        try { await page.getByRole('list',{name:'부원 이용권 목록',exact:true}).getByText('가상 회원',{exact:true}).waitFor(); }
        catch (error) {
          await page.screenshot({path:`${root}/output/playwright/pass-list-failure-${name}-${width}.png`});
          console.error(JSON.stringify({engine:name,width,body:await page.locator('body').innerText(),errors:state.errors,unknown:state.unknown,traffic:state.traffic.slice(-15)}));
          throw error;
        }
        assert(await page.getByRole('combobox',{name:'이용권 부원'}).count()===0,'Pass directory still uses a member dropdown');
        const compactRows = await page.getByRole('list',{name:'부원 이용권 목록',exact:true}).locator('li').evaluateAll(rows => rows.every(row => {
          const rect = row.getBoundingClientRect();
          const elements = Array.from(row.querySelectorAll('button > span'));
          const fields = elements.map(field => field.getBoundingClientRect());
          const remainingText = document.createRange(); remainingText.selectNodeContents(elements[3]);
          return rect.height <= 48 && fields.length === 4 && remainingText.getBoundingClientRect().right <= rect.right - 16 && fields.every(field => Math.abs(field.y + field.height / 2 - (fields[0].y + fields[0].height / 2)) < 2 && field.right <= rect.right);
        }));
        assert(compactRows, 'Member pass rows are not four aligned fields on a compact single line');
        await page.screenshot({path:`${root}/output/playwright/compact-pass-list-${name}-${width}.png`});
        await page.getByRole('button',{name:'가상 회원 이력·수정',exact:true}).click();
        await page.getByRole('region',{name:'숙박 이력',exact:true}).getByText('2026.11.12',{exact:true}).waitFor();
        await page.getByRole('button',{name:'이용권 수정',exact:true}).click();
        assert(await page.getByRole('dialog').locator('input[type="date"]').count()===0,'Pass editor still asks for start/end dates');
        await page
          .getByRole("combobox", { name: "이용권 종류" })
          .selectOption("10");
        await page
          .getByRole("button", { name: "이용권 저장", exact: true })
          .click();
        await page
          .getByText("이용권을 저장했습니다.", { exact: true })
          .waitFor();
        assert(state.seasonPasses[99101].totalNights === 10, "Pass not saved");
        await page.getByRole('region',{name:'선택한 부원 이용권',exact:true}).getByRole('heading',{name:'10박권',exact:true}).waitFor();
        assert(await page.getByRole('button',{name:'이용권 저장',exact:true}).count()===0,'Pass editor did not close after save');
        await fits();
        await page.screenshot({
          path: `${root}/output/playwright/season-stays-${name}-${width}.png`,
        });
        await page.getByRole('dialog').getByRole('button',{name:'닫기',exact:true}).click();
        const memberSearch = page.getByRole('textbox',{name:'부원 검색',exact:true});
        const memberSearchBox = await memberSearch.boundingBox();
        const memberSearchIcon = await page.locator('label').filter({has:memberSearch}).locator('svg').boundingBox();
        assert(memberSearchBox && memberSearchIcon && memberSearchBox.x >= memberSearchIcon.x + memberSearchIcon.width + 8, 'Pass search icon overlaps placeholder or typed text');
        await memberSearch.fill('20260002');
        await page.getByRole('list',{name:'부원 이용권 목록',exact:true}).getByText('가상 부원',{exact:true}).waitFor();
        assert(await page.getByRole('list',{name:'부원 이용권 목록',exact:true}).getByText('가상 회원',{exact:true}).count()===0,'Member search did not filter');
        await page.getByRole('textbox',{name:'부원 검색',exact:true}).fill('');
        await page.getByRole('list',{name:'부원 이용권 목록',exact:true}).getByText('가상 회원',{exact:true}).waitFor();
        await page.getByRole('checkbox',{name:'현재 목록 전체 선택',exact:true}).check();
        await page.getByRole('button',{name:'풀상주 할당',exact:true}).click();
        const bulk=page.getByRole('dialog');
        assert(await bulk.locator('input[type="date"]').count()===0,'Bulk pass assignment still asks for start/end dates');
        await bulk.getByRole('button',{name:'선택 2명에게 할당',exact:true}).click();
        await page.getByText('2명에게 이용권을 할당했습니다.',{exact:true}).waitFor();
        assert(state.seasonPasses[99101].totalNights===null&&state.seasonPasses[99102].totalNights===null,'Bulk unlimited assignment failed');
        await page.getByRole('checkbox',{name:'현재 목록 전체 선택',exact:true}).check();
        await page.getByRole('button',{name:'10박권 할당',exact:true}).click();
        await page.getByRole('dialog').getByRole('button',{name:'선택 2명에게 할당',exact:true}).click();
        await page.getByText('2명에게 이용권을 할당했습니다.',{exact:true}).waitFor();
        await page.goto(`${origin}/?view=notifications`);
        await page
          .getByRole("heading", { name: "알림", exact: true })
          .waitFor();
        await page
          .getByRole("button")
          .filter({ hasText: "입실 후 청소 분담을 확인해 주세요." })
          .click();
        await page
          .getByRole("heading", { name: "나의 달력", exact: true })
          .waitFor();
        assert(state.notifications[0].read, "Notification was not marked read");
        assert(
          state.stayAnnouncements[0].recipients.find(
            (item) => item.accountId === 99101,
          ).read,
          "Read receipt not reflected",
        );
        await page.getByText("추가 예약 6박 가능", { exact: true }).waitFor();
        await fits();
        // The batch reservation entry point also fails closed until consent.
        await Promise.all([
          page.waitForResponse((res) => res.url().includes("/season-stays/pass")),
          page.waitForResponse((res) => res.url().includes("/reservations/days/2026-11-13")),
          page.waitForResponse((res) => res.url().includes("/calendar/my")),
          page.getByRole("button", { name: "예약 취소", exact: true }).click(),
        ]);
        await page.getByText("예약 내역이 없습니다.", { exact: true }).waitFor();
        await page.goto(`${origin}/?view=reservation`);
        await day(13).click();
        const batchApply = page.getByRole("button", { name: "1일 예약 신청", exact: true });
        assert(await batchApply.isDisabled(), "Batch booking bypassed consent");
        await page.getByRole("checkbox", { name: "숙박일 기준을 확인하고 동의합니다. *", exact: true }).check();
        await batchApply.click();
        await page.waitForFunction(() => document.body.innerText.includes("예약할 날짜를 선택하면 여기에 표시됩니다."));
        assert(state.writes.filter(item => item.path.endsWith('/reservations')).every(item => item.body.stayPolicyVersion === 1), "Missing policy in a booking entry point");
        await page.goto(`${origin}/?view=season_calendar`);
        await day(12).click();
        await page.getByRole("button", { name: "이용 완료 취소", exact: true }).click();
        assert(state.bookings.find(item => item.reservationId === 80).stayCompleted === false, "Stay completion was not persisted");
        await fits();
        assert(
          !state.errors.length && !state.unknown.length,
          `Fixture errors: ${JSON.stringify({ errors: state.errors, unknown: state.unknown })}`,
        );
        completed.push({
          engine: name,
          width,
          pass: true,
          consent: true,
          announcement: true,
          notificationNavigation: true,
          overflow: false,
        });
        await context.close();
      }
    } finally {
      await browser.close();
    }
  }
  writeFileSync(
    `${root}/output/playwright/season-stays-results.json`,
    JSON.stringify(completed, null, 2),
  );
  console.log(JSON.stringify(completed));
} finally {
  server?.kill("SIGTERM");
}
