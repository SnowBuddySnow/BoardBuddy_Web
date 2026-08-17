import fs from "node:fs/promises";
import path from "node:path";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const ROOT = "/Users/jake/Desktop/Jake/Devs/BoardBuddy";
const WORK = path.join(ROOT, "BoardBuddy_Web/output/boardbuddy-guide");
const ASSETS = path.join(WORK, "assets");
const RENDERED = path.join(WORK, "rendered");
const OUTPUT = path.join(ROOT, "BoardBuddy_사용설명서.pptx");

const W = 1280;
const H = 720;
const C = {
  white: "#FFFFFF",
  paper: "#FAF9F6",
  ink: "#151515",
  muted: "#5C6473",
  rule: "#D7D9DE",
  panel: "#EEEFF2",
  navy: "#17265E",
  navy2: "#253979",
  amber: "#F5C84C",
  sky: "#DCEBFF",
  blue: "#4C75E8",
  green: "#3B8B65",
};
const FONT = "Arial";

async function imageBytes(name) {
  const b = await fs.readFile(path.join(ASSETS, name));
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
}

function box(slide, x, y, w, h, fill = C.white, line = C.rule, radius = 18, name = undefined) {
  return slide.shapes.add({
    geometry: radius ? "roundRect" : "rect",
    name,
    position: { left: x, top: y, width: w, height: h },
    fill,
    line: { style: "solid", fill: line, width: line === "none" ? 0 : 1 },
    borderRadius: radius,
  });
}

function text(slide, value, x, y, w, h, size = 20, color = C.ink, bold = false, opts = {}) {
  const shape = slide.shapes.add({
    geometry: "textbox",
    name: opts.name,
    position: { left: x, top: y, width: w, height: h },
    fill: "none",
    line: { style: "solid", fill: "none", width: 0 },
  });
  shape.text = value;
  shape.text.style = {
    fontSize: size,
    color,
    bold,
    typeface: FONT,
    alignment: opts.align ?? "left",
    verticalAlignment: opts.valign ?? "top",
    autoFit: opts.autoFit ?? "shrinkText",
  };
  return shape;
}

function rule(slide, x, y, w, color = C.rule, weight = 1) {
  return slide.shapes.add({
    geometry: "line",
    position: { left: x, top: y, width: w, height: 0 },
    fill: "none",
    line: { style: "solid", fill: color, width: weight },
  });
}

function header(slide, section, titleValue, page) {
  text(slide, section, 54, 34, 280, 26, 14, C.navy2, true, { valign: "middle" });
  text(slide, titleValue, 54, 70, 1170, 62, 38, C.ink, true, { autoFit: "none" });
  rule(slide, 54, 140, 1172, C.rule, 1);
  text(slide, String(page).padStart(2, "0"), 1182, 676, 44, 20, 12, C.muted, false, { align: "right" });
}

function addNotes(slide, detail) {
  slide.speakerNotes.textFrame.setText(`${detail}\n[Sources]\n- Local BoardBuddy development build screenshot, 2026-08-12`);
  slide.speakerNotes.setVisible(false);
}

async function screenshot(slide, name, x, y, w, h, opts = {}) {
  box(slide, x - 8, y - 8, w + 16, h + 16, C.white, C.rule, 18);
  return slide.images.add({
    blob: await imageBytes(name),
    contentType: "image/jpeg",
    alt: opts.alt ?? "BoardBuddy application screenshot",
    fit: opts.fit ?? "cover",
    crop: opts.crop,
    geometry: "roundRect",
    borderRadius: 12,
    position: { left: x, top: y, width: w, height: h },
  });
}

function numberDot(slide, n, x, y, fill = C.amber, color = C.navy) {
  const dot = slide.shapes.add({
    geometry: "ellipse",
    position: { left: x, top: y, width: 34, height: 34 },
    fill,
    line: { style: "solid", fill: C.white, width: 2 },
  });
  dot.text = String(n);
  dot.text.style = { fontSize: 17, bold: true, color, typeface: FONT, alignment: "center", verticalAlignment: "middle" };
}

function stepList(slide, steps, x, y, w, accent = C.navy) {
  steps.forEach((step, i) => {
    const yy = y + i * 112;
    numberDot(slide, i + 1, x, yy, i === 0 ? C.amber : C.sky, C.navy);
    text(slide, step.title, x + 48, yy - 1, w - 48, 28, 20, C.ink, true);
    text(slide, step.body, x + 48, yy + 34, w - 48, 64, 16, C.muted, false);
    if (i < steps.length - 1) rule(slide, x + 48, yy + 100, w - 48, C.rule, 1);
  });
}

function roleLabel(slide, label, x, y, w, fill = C.navy, color = C.white) {
  const r = box(slide, x, y, w, 34, fill, "none", 17);
  r.text = label;
  r.text.style = { fontSize: 15, bold: true, color, typeface: FONT, alignment: "center", verticalAlignment: "middle" };
}

function sectionDivider(pres, eyebrow, titleValue, subtitle, index, tone = "dark") {
  const s = pres.slides.add();
  s.background.fill = tone === "dark" ? C.navy : C.paper;
  const ink = tone === "dark" ? C.white : C.ink;
  const muted = tone === "dark" ? "#C7CEE8" : C.muted;
  text(s, eyebrow, 58, 52, 500, 30, 15, tone === "dark" ? C.amber : C.navy2, true);
  text(s, titleValue, 58, 208, 1030, 116, 64, ink, true, { autoFit: "none" });
  text(s, subtitle, 60, 356, 790, 72, 24, muted, false);
  rule(s, 60, 506, 1160, tone === "dark" ? "#536190" : C.rule, 1);
  text(s, String(index).padStart(2, "0"), 1176, 654, 44, 24, 13, muted, false, { align: "right" });
  addNotes(s, subtitle);
  return s;
}

function addDesktopGuideSlide(pres, config, page) {
  const s = pres.slides.add();
  s.background.fill = C.paper;
  header(s, config.section, config.title, page);
  roleLabel(s, config.role, 54, 166, config.roleWidth ?? 146, config.roleFill ?? C.navy);
  text(s, config.lead, 54, 220, 330, 82, 24, C.ink, true);
  stepList(s, config.steps, 54, 326, 350);
  return screenshot(s, config.image, 430, 166, 796, 490, {
    alt: config.alt,
    crop: config.crop ?? { left: 0, top: 0, right: 0, bottom: 0.045 },
  }).then(() => {
    (config.marks ?? []).forEach((m) => numberDot(s, m.n, 430 + m.x, 166 + m.y));
    addNotes(s, config.notes ?? config.lead);
    return s;
  });
}

function addMobileGuideSlide(pres, config, page) {
  const s = pres.slides.add();
  s.background.fill = C.paper;
  header(s, "일반 사용자 · 모바일", config.title, page);
  roleLabel(s, "일반 멤버", 54, 165, 118, C.green);
  text(s, config.lead, 54, 216, 350, 76, 24, C.ink, true);
  stepList(s, config.steps, 745, 220, 460, C.green);
  const phone = { x: 454, y: 148, w: 246, h: 532 };
  return screenshot(s, config.image, phone.x, phone.y, phone.w, phone.h, {
    alt: config.alt,
    fit: "cover",
    crop: config.crop,
  }).then(() => {
    (config.marks ?? []).forEach((m) => numberDot(
      s,
      m.n,
      phone.x + m.x * (phone.w / 276),
      phone.y + m.y * (phone.h / 500),
      C.amber,
      C.navy,
    ));
    addNotes(s, config.notes ?? config.lead);
    return s;
  });
}

async function build() {
  await fs.mkdir(RENDERED, { recursive: true });
  const p = Presentation.create({ slideSize: { width: W, height: H } });

  // 01 — minimal cover, adapted from Codex Grid's image-field cover silhouette.
  {
    const s = p.slides.add();
    s.background.fill = C.paper;
    text(s, "BOARD BUDDY", 56, 44, 320, 28, 15, C.navy2, true);
    text(s, "BoardBuddy\n사용 설명서", 56, 180, 500, 150, 58, C.ink, true, { autoFit: "none" });
    text(s, "운영진 데스크톱 · 일반 사용자 모바일", 58, 350, 500, 44, 22, C.muted, false);
    const stripe = box(s, 58, 444, 152, 10, C.amber, "none", 5);
    stripe.sendToBack();
    await screenshot(s, "desktop-role-guide.png", 650, 44, 572, 608, {
      alt: "BoardBuddy role guide screenshot",
      crop: { left: 0.06, top: 0.05, right: 0.03, bottom: 0.08 },
    });
    text(s, "화면 캡처 기준 · 2026.08", 58, 642, 300, 24, 14, C.muted);
    addNotes(s, "운영진과 일반 사용자가 실제 화면에서 어디를 눌러야 하는지 안내하는 사용 설명서입니다.");
  }

  // 02 — audience map.
  {
    const s = p.slides.add();
    s.background.fill = C.white;
    header(s, "이 설명서의 구성", "역할은 겹칠 수 있고, 화면은 권한에 따라 열립니다", 2);
    text(s, "한 사용자가 크루 매니저와 이벤트 그룹 매니저 역할을 함께 가질 수 있습니다. Captain은 두 운영 영역에 더해 역할을 부여합니다.", 54, 165, 1120, 58, 20, C.muted);
    const cols = [54, 346, 638, 930];
    const roles = [
      ["일반 멤버", "모임 찾기\n참여 신청\n내 일정 확인", C.green],
      ["크루 매니저", "가입 승인\n예약 운영\n참가·결제 관리", C.blue],
      ["이벤트 그룹 매니저", "그룹 멤버 관리\n이벤트 생성·운영\n소유권 이전", C.navy2],
      ["Captain", "두 운영 영역\n역할 부여\n크루 설정", C.amber],
    ];
    roles.forEach((r, i) => {
      box(s, cols[i], 268, 250, 286, i === 3 ? "#FFF8DE" : C.paper, C.rule, 0);
      box(s, cols[i], 268, 250, 10, r[2], "none", 0);
      text(s, r[0], cols[i] + 22, 304, 206, 40, 23, C.ink, true);
      text(s, r[1], cols[i] + 22, 382, 206, 116, 19, C.muted, false);
    });
    text(s, "운영진용 · 데스크톱", 346, 586, 542, 34, 18, C.navy, true, { align: "center" });
    rule(s, 346, 626, 542, C.navy2, 3);
    text(s, "일반 사용자용 · 모바일", 54, 586, 250, 34, 18, C.green, true, { align: "center" });
    rule(s, 54, 626, 250, C.green, 3);
    addNotes(s, "역할은 계층만으로 배타적으로 나뉘지 않으며 사용자에게 조합해 부여할 수 있습니다.");
  }

  sectionDivider(p, "PART 1", "운영진용 · 데스크톱", "역할별로 운영 센터에서 시작해 필요한 작업 화면으로 이동합니다.", 3, "dark");

  await addDesktopGuideSlide(p, {
    section: "운영진 공통 · 데스크톱",
    title: "운영 센터에서 담당 업무를 선택합니다",
    role: "모든 운영진",
    roleWidth: 132,
    lead: "권한이 있는 메뉴만 운영 센터에 표시됩니다.",
    image: "desktop-operations-center.png",
    alt: "Operations center desktop screenshot",
    steps: [
      { title: "운영 센터 열기", body: "좌측 메뉴에서 운영 센터를 선택합니다." },
      { title: "업무 영역 선택", body: "소모임, 소모임 그룹, 크루 관리 중 담당 영역으로 들어갑니다." },
      { title: "권한 확인", body: "보이지 않는 메뉴는 현재 계정에 해당 역할이 없는 상태입니다." },
    ],
    marks: [{ n: 1, x: 18, y: 170 }, { n: 2, x: 300, y: 238 }],
  }, 4);

  await addDesktopGuideSlide(p, {
    section: "Captain · 데스크톱",
    title: "Captain은 운영 역할을 부여합니다",
    role: "Captain",
    roleWidth: 102,
    roleFill: C.amber,
    lead: "크루 운영의 최종 책임자로서 역할과 크루 설정을 관리합니다.",
    image: "desktop-captain-crew-permissions.png",
    alt: "Crew permission management desktop screenshot",
    steps: [
      { title: "크루 관리 열기", body: "운영 센터에서 크루 관리를 엽니다." },
      { title: "사용자 찾기", body: "멤버 이름을 확인하고 역할을 선택합니다." },
      { title: "역할 변경 저장", body: "두 매니저 역할을 필요에 맞게 변경합니다." },
    ],
    marks: [{ n: 1, x: 22, y: 160 }, { n: 2, x: 195, y: 252 }, { n: 3, x: 560, y: 252 }],
  }, 5);

  await addDesktopGuideSlide(p, {
    section: "크루 매니저 · 데스크톱",
    title: "크루 매니저는 가입과 예약 운영을 책임집니다",
    role: "크루 매니저",
    roleWidth: 132,
    roleFill: C.blue,
    lead: "크루 안에서 반복되는 운영 업무를 한 흐름으로 처리합니다.",
    image: "desktop-role-guide.png",
    alt: "Role hierarchy and permission guide screenshot",
    crop: { left: 0.05, top: 0.18, right: 0.04, bottom: 0.12 },
    steps: [
      { title: "가입 신청 처리", body: "신규 신청을 확인하고 승인 또는 반려합니다." },
      { title: "예약 일정 운영", body: "예약 일정과 정원을 설정하고 참가자를 관리합니다." },
      { title: "상태 기록", body: "결제 여부와 운영 메모를 최신 상태로 유지합니다." },
    ],
    marks: [{ n: 1, x: 270, y: 226 }, { n: 2, x: 432, y: 226 }, { n: 3, x: 594, y: 226 }],
  }, 6);

  await addDesktopGuideSlide(p, {
    section: "이벤트 그룹 매니저 · 데스크톱",
    title: "먼저 담당 이벤트 그룹을 선택합니다",
    role: "이벤트 그룹 매니저",
    roleWidth: 184,
    roleFill: C.navy2,
    lead: "그룹 단위로 참여 크루와 소모임을 함께 관리합니다.",
    image: "desktop-event-manager-groups.png",
    alt: "Event group list desktop screenshot",
    steps: [
      { title: "소모임 그룹 열기", body: "운영 센터에서 소모임 그룹을 엽니다." },
      { title: "담당 그룹 선택", body: "관리할 그룹 카드를 선택합니다." },
      { title: "멤버 관리 진입", body: "참여 크루나 관리자를 바꿀 때 멤버 관리를 엽니다." },
    ],
    marks: [{ n: 1, x: 22, y: 156 }, { n: 2, x: 214, y: 264 }, { n: 3, x: 564, y: 347 }],
  }, 7);

  await addDesktopGuideSlide(p, {
    section: "이벤트 그룹 매니저 · 데스크톱",
    title: "그룹 멤버를 관리하고 소유권을 넘길 수 있습니다",
    role: "이벤트 그룹 매니저",
    roleWidth: 184,
    roleFill: C.navy2,
    lead: "참여 크루와 매니저를 확인한 뒤 필요한 변경만 수행합니다.",
    image: "desktop-event-manager-members.png",
    alt: "Event group member management desktop screenshot",
    steps: [
      { title: "참여 크루 확인", body: "그룹에 연결된 크루와 현재 상태를 확인합니다." },
      { title: "관리자 선택", body: "소유권을 받을 이벤트 그룹 매니저를 찾습니다." },
      { title: "소유권 이전", body: "이전 아이콘을 선택하고 확인 창에서 최종 확정합니다." },
    ],
    marks: [{ n: 1, x: 120, y: 240 }, { n: 2, x: 412, y: 322 }, { n: 3, x: 690, y: 322 }],
  }, 8);

  await addDesktopGuideSlide(p, {
    section: "이벤트 그룹 매니저 · 데스크톱",
    title: "소모임 목록에서 생성과 운영 상태를 관리합니다",
    role: "이벤트 그룹 매니저",
    roleWidth: 184,
    roleFill: C.navy2,
    lead: "그룹에 속한 이벤트를 한 표에서 찾고 상세 화면으로 이어갑니다.",
    image: "desktop-event-manager-parties.png",
    alt: "Event party management list desktop screenshot",
    steps: [
      { title: "소모임 관리 열기", body: "운영 센터에서 소모임 관리를 엽니다." },
      { title: "새 소모임 만들기", body: "생성 버튼에서 일정과 모집 정보를 입력합니다." },
      { title: "상세 운영 열기", body: "목록 행에서 참가자·결제·메모를 관리합니다." },
    ],
    marks: [{ n: 1, x: 20, y: 160 }, { n: 2, x: 666, y: 120 }, { n: 3, x: 520, y: 292 }],
  }, 9);

  await addDesktopGuideSlide(p, {
    section: "이벤트 그룹 매니저 · 데스크톱",
    title: "상세 화면에서 참가자 상태를 끝까지 관리합니다",
    role: "이벤트 그룹 매니저",
    roleWidth: 184,
    roleFill: C.navy2,
    lead: "신청 이후의 참가·결제·안내 기록을 한 화면에서 마무리합니다.",
    image: "desktop-event-manager-party-detail.png",
    alt: "Event party detail management desktop screenshot",
    steps: [
      { title: "참가자 확인", body: "신청자와 참가 상태를 먼저 확인합니다." },
      { title: "결제·메모 갱신", body: "운영 중 확인한 내용을 즉시 기록합니다." },
      { title: "안내 설정 확인", body: "채팅과 공지 설정을 확인해 참가자가 정보를 놓치지 않게 합니다." },
    ],
    marks: [{ n: 1, x: 275, y: 246 }, { n: 2, x: 563, y: 352 }, { n: 3, x: 680, y: 412 }],
  }, 10);

  sectionDivider(p, "PART 2", "일반 사용자용 · 모바일", "홈에서 모임을 찾고 신청한 뒤 내 일정과 계정 정보를 확인합니다.", 11, "light");

  await addMobileGuideSlide(p, {
    title: "홈에서 오늘 필요한 정보를 먼저 확인합니다",
    lead: "현재 크루와 다가오는 일정이 홈에 모여 있습니다.",
    image: "mobile-member-home.png",
    alt: "BoardBuddy mobile home screenshot",
    steps: [
      { title: "현재 크루 확인", body: "내가 속한 크루와 상태를 확인합니다." },
      { title: "다가오는 일정 확인", body: "홈의 일정 영역에서 가까운 예약과 이벤트를 봅니다." },
      { title: "하단 메뉴로 이동", body: "홈·소모임·나의 소모임·내 정보로 바로 이동합니다." },
    ],
    marks: [{ n: 1, x: 24, y: 88 }, { n: 2, x: 196, y: 286 }, { n: 3, x: 118, y: 448 }],
  }, 12);

  await addMobileGuideSlide(p, {
    title: "소모임 목록에서 조건에 맞는 모임을 찾습니다",
    lead: "필터와 카드 정보를 함께 보고 참여할 모임을 고릅니다.",
    image: "mobile-member-events.png",
    alt: "Mobile event discovery screenshot",
    steps: [
      { title: "조건 좁히기", body: "기간과 상태 필터로 원하는 모임만 남깁니다." },
      { title: "카드 정보 비교", body: "일정·장소·모집 상태를 확인합니다." },
      { title: "상세 화면 열기", body: "관심 있는 모임 카드를 눌러 상세 내용을 봅니다." },
    ],
    marks: [{ n: 1, x: 30, y: 98 }, { n: 2, x: 165, y: 238 }, { n: 3, x: 112, y: 386 }],
  }, 13);

  await addMobileGuideSlide(p, {
    title: "상세 내용을 확인한 뒤 참여를 신청합니다",
    lead: "신청 전 일정과 운영 방식을 마지막으로 확인합니다.",
    image: "mobile-member-event-detail.png",
    alt: "Mobile event detail and join screenshot",
    steps: [
      { title: "기본 정보 확인", body: "일시·장소·정원·참가비를 확인합니다." },
      { title: "안내 내용 읽기", body: "운영 방식과 준비물을 확인합니다." },
      { title: "참여 신청하기", body: "하단 버튼을 누르고 신청 결과를 확인합니다." },
    ],
    marks: [{ n: 1, x: 28, y: 94 }, { n: 2, x: 166, y: 286 }, { n: 3, x: 110, y: 448 }],
  }, 14);

  await addMobileGuideSlide(p, {
    title: "나의 소모임에서 신청 상태와 일정을 확인합니다",
    lead: "참여 확정과 대기 상태를 한곳에서 구분합니다.",
    image: "mobile-member-my-events.png",
    alt: "Mobile my events screenshot",
    steps: [
      { title: "상태별 확인", body: "참여 예정·대기·완료 항목을 구분해 봅니다." },
      { title: "상세 일정 열기", body: "카드를 눌러 장소와 시작 시간을 다시 확인합니다." },
      { title: "변경 사항 확인", body: "운영진 안내와 상태 변경을 최신 기준으로 확인합니다." },
    ],
    marks: [{ n: 1, x: 30, y: 92 }, { n: 2, x: 168, y: 242 }, { n: 3, x: 106, y: 402 }],
  }, 15);

  await addMobileGuideSlide(p, {
    title: "내 정보에서 계정과 역할 안내를 관리합니다",
    lead: "내 활동 기록과 계정 설정을 마지막으로 확인합니다.",
    image: "mobile-member-my-info.png",
    alt: "Mobile my information screenshot",
    steps: [
      { title: "활동 일정 확인", body: "달력에서 예약과 소모임 일정을 확인합니다." },
      { title: "역할 안내 열기", body: "현재 역할과 역할별 권한이 궁금할 때 확인합니다." },
      { title: "계정 관리", body: "프로필과 계정 관련 설정을 변경합니다." },
    ],
    marks: [{ n: 1, x: 26, y: 96 }, { n: 2, x: 170, y: 310 }, { n: 3, x: 114, y: 414 }],
  }, 16);

  // 17 — close by resolving the two journeys.
  {
    const s = p.slides.add();
    s.background.fill = C.navy;
    text(s, "QUICK REFERENCE", 58, 44, 360, 30, 15, C.amber, true);
    text(s, "두 가지 흐름만 기억하면 됩니다", 58, 104, 1030, 64, 42, C.white, true, { autoFit: "none" });
    box(s, 58, 220, 548, 300, "#23336E", "#536190", 0);
    text(s, "운영진", 86, 252, 180, 34, 24, C.amber, true);
    text(s, "운영 센터  →  담당 영역  →  상세 운영\n\n권한이 보이지 않으면 Captain에게 역할을 확인합니다.", 86, 314, 470, 136, 22, C.white, false);
    box(s, 674, 220, 548, 300, "#23336E", "#536190", 0);
    text(s, "일반 사용자", 702, 252, 210, 34, 24, "#9FE0C0", true);
    text(s, "소모임 찾기  →  상세 확인  →  참여 신청\n\n나의 소모임에서 신청 상태와 일정을 다시 확인합니다.", 702, 314, 470, 136, 22, C.white, false);
    rule(s, 58, 574, 1164, "#536190", 1);
    text(s, "BoardBuddy · 운영 흐름에 맞춘 화면 안내", 58, 614, 680, 30, 17, "#C7CEE8");
    text(s, "17", 1178, 654, 44, 22, 13, "#C7CEE8", false, { align: "right" });
    addNotes(s, "운영진과 일반 사용자에게 각자의 시작점과 다음 행동을 다시 짚어 주세요.");
  }

  for (const [i, slide] of p.slides.items.entries()) {
    const stem = `slide-${String(i + 1).padStart(2, "0")}`;
    const png = await p.export({ slide, format: "png", scale: 1 });
    await fs.writeFile(path.join(RENDERED, `${stem}.png`), new Uint8Array(await png.arrayBuffer()));
    const layout = await slide.export({ format: "layout" });
    await fs.writeFile(path.join(RENDERED, `${stem}.layout.json`), await layout.text());
  }
  const montage = await p.export({ format: "webp", montage: true, scale: 1 });
  await fs.writeFile(path.join(RENDERED, "deck-montage.webp"), new Uint8Array(await montage.arrayBuffer()));
  const pptx = await PresentationFile.exportPptx(p);
  await pptx.save(OUTPUT);
  console.log(OUTPUT);
}

build().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
