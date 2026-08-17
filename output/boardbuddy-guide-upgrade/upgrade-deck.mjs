import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, PresentationFile } from "@oai/artifact-tool";

const ROOT = "/Users/jake/Desktop/Jake/Devs/BoardBuddy";
const WORK = path.join(ROOT, "BoardBuddy_Web/output/boardbuddy-guide-upgrade");
const ASSETS = path.join(WORK, "assets");
const RENDERED = path.join(WORK, "artifact-render");
const SOURCE = path.join(ROOT, "BoardBuddy_사용설명서.pptx");
const OUTPUT = path.join(ROOT, "BoardBuddy_사용설명서_v2.pptx");

async function bytes(name) {
  const value = await fs.readFile(path.join(ASSETS, name));
  return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength);
}

function parseNdjson(ndjson) {
  return ndjson.split("\n").filter(Boolean).map((line) => JSON.parse(line));
}

function near(a, b, tolerance = 3) {
  return Math.abs(a - b) <= tolerance;
}

function bboxMatch(record, left, top, tolerance = 3) {
  return record.bbox && near(record.bbox[0], left, tolerance) && near(record.bbox[1], top, tolerance);
}

async function main() {
  await fs.mkdir(RENDERED, { recursive: true });
  const p = await PresentationFile.importPptx(await FileBlob.load(SOURCE));

  // Duplicate and move each slide immediately. Slide handles are index-backed,
  // so retaining several handles while the collection changes can retarget them.
  const responseDivider = p.slides.getItem(2).duplicate();
  responseDivider.moveTo(10);
  const responseTemplates = p.slides.getItem(8).duplicate();
  responseTemplates.moveTo(11);
  const responsePreview = p.slides.getItem(9).duplicate();
  responsePreview.moveTo(12);
  const responseManagement = p.slides.getItem(9).duplicate();
  responseManagement.moveTo(13);
  const responseParticipant = p.slides.getItem(9).duplicate();
  responseParticipant.moveTo(14);

  const snapshot = await p.inspect({
    kind: "slide,textbox,shape,image,notes",
    include: "id,slide,text,bbox,name,alt",
    maxChars: 250000,
  });
  const records = parseNdjson(snapshot.ndjson);

  function recordAt(slide, left, top, kinds = ["textbox", "shape"], tolerance = 3) {
    const found = records.find((record) => record.slide === slide && kinds.includes(record.kind) && bboxMatch(record, left, top, tolerance));
    if (!found) throw new Error(`No ${kinds.join("/")} at slide ${slide}, ${left}, ${top}`);
    return found;
  }

  function setTextAt(slide, left, top, value, tolerance = 3) {
    const target = p.resolve(recordAt(slide, left, top, ["textbox"], tolerance).id);
    target.text = value;
    return target;
  }

  function setTextByCurrent(slide, current, value) {
    const record = records.find((item) => item.slide === slide && item.kind === "textbox" && item.text === current);
    if (!record) throw new Error(`No textbox with text ${JSON.stringify(current)} on slide ${slide}`);
    const target = p.resolve(record.id);
    target.text = value;
    return target;
  }

  function setPosAt(slide, left, top, next, kinds = ["textbox", "shape"], tolerance = 3) {
    const target = p.resolve(recordAt(slide, left, top, kinds, tolerance).id);
    target.position = next;
    return target;
  }

  async function replaceImage(slideNumber, name, crop = undefined, fit = "cover") {
    const rec = records.find((record) => record.slide === slideNumber && record.kind === "image");
    if (!rec) throw new Error(`No image on slide ${slideNumber}`);
    const image = p.resolve(rec.id);
    const frame = image.frame;
    const geometry = image.geometry;
    const borderRadius = image.borderRadius;
    await image.replace({
      blob: await bytes(name),
      contentType: "image/jpeg",
      alt: `BoardBuddy current product screen: ${name}`,
      fit,
    });
    image.frame = frame;
    image.geometry = geometry;
    image.borderRadius = borderRadius;
    image.crop = crop;
  }

  async function overlayImage(slideNumber, name, fit = "cover") {
    const rec = records.find((record) => record.slide === slideNumber && record.kind === "image");
    if (!rec?.bbox) throw new Error(`No image frame on slide ${slideNumber}`);
    const slide = p.slides.getItem(slideNumber - 1);
    slide.shapes.add({
      geometry: "roundRect",
      position: { left: rec.bbox[0], top: rec.bbox[1], width: rec.bbox[2], height: rec.bbox[3] },
      fill: "#FFFFFF",
      line: { style: "solid", fill: "#FFFFFF", width: 0 },
      borderRadius: 12,
    });
    return slide.images.add({
      blob: await bytes(name),
      contentType: "image/jpeg",
      alt: `BoardBuddy current product screen: ${name}`,
      fit,
      geometry: "roundRect",
      borderRadius: 12,
      position: { left: rec.bbox[0], top: rec.bbox[1], width: rec.bbox[2], height: rec.bbox[3] },
    });
  }

  function setNotes(slideNumber, summary) {
    const slide = p.slides.getItem(slideNumber - 1);
    slide.speakerNotes.textFrame.setText(`${summary}\n[Sources]\n- Local BoardBuddy development build screenshot and implementation, 2026-08-17`);
    slide.speakerNotes.setVisible(false);
  }

  function addTag(slide, value, left, top, width, fill, color) {
    const tag = slide.shapes.add({
      geometry: "roundRect",
      position: { left, top, width, height: 27 },
      fill,
      line: { style: "solid", fill, width: 1 },
      borderRadius: 13,
    });
    tag.text = value;
    tag.text.style = {
      fontSize: 13,
      color,
      bold: true,
      typeface: "Arial",
      alignment: "center",
      verticalAlignment: "middle",
      autoFit: "shrinkText",
    };
    return tag;
  }

  // Slide 2 — turn the four parallel cards into a compact hierarchy.
  setTextAt(2, 54, 70, "역할은 쌓이고, Captain은 대표 권한을 더합니다");
  setTextAt(2, 54, 165, "모든 사용자는 일반 멤버로 시작합니다. 두 매니저 역할은 필요에 따라 함께 부여되며, Captain은 두 역할과 크루 대표 권한을 가집니다.");

  const roleMoves = [
    // member
    [54, 268, { left: 268, top: 570, width: 744, height: 76 }, ["shape"]],
    [54, 268, { left: 268, top: 570, width: 744, height: 8 }, ["shape"], 1],
  ];
  // Resolve the two shapes sharing the same origin by source dimensions.
  const slide2Shapes = records.filter((record) => record.slide === 2 && record.kind === "shape");
  const moveShapeByBox = (box, next, fill) => {
    const rec = slide2Shapes.find((record) => record.bbox && box.every((v, i) => near(record.bbox[i], v, 2)));
    if (!rec) throw new Error(`Missing slide 2 shape ${box.join(",")}`);
    const shape = p.resolve(rec.id);
    shape.position = next;
    if (fill) shape.fill = fill;
    return shape;
  };

  moveShapeByBox([54,268,250,286], {left:268,top:570,width:744,height:76}, "#F3F4F6");
  moveShapeByBox([54,268,250,10], {left:268,top:570,width:744,height:8}, "#3B8B65");
  moveShapeByBox([346,268,250,286], {left:130,top:390,width:480,height:154}, "#FFFFFF");
  moveShapeByBox([346,268,250,10], {left:130,top:390,width:480,height:8}, "#4C75E8");
  moveShapeByBox([638,268,250,286], {left:670,top:390,width:480,height:154}, "#FFFFFF");
  moveShapeByBox([638,268,250,10], {left:670,top:390,width:480,height:8}, "#253979");
  moveShapeByBox([930,268,250,286], {left:388,top:230,width:504,height:122}, "#FFF7D8");
  moveShapeByBox([930,268,250,10], {left:388,top:230,width:504,height:8}, "#F5C84C");

  const moveText = (left, top, value, next) => {
    const shape = setTextAt(2, left, top, value);
    shape.position = next;
  };
  moveText(76,304,"일반 멤버",{left:292,top:590,width:150,height:30});
  moveText(76,382,"",{left:454,top:587,width:530,height:34});
  moveText(368,304,"크루 매니저",{left:154,top:414,width:220,height:34});
  moveText(368,382,"",{left:154,top:458,width:420,height:64});
  moveText(660,304,"이벤트 그룹 매니저",{left:694,top:414,width:260,height:34});
  moveText(660,382,"",{left:694,top:458,width:420,height:64});
  moveText(952,304,"Captain",{left:414,top:252,width:180,height:34});
  moveText(952,382,"",{left:414,top:294,width:450,height:54});
  const managerLabel = setTextByCurrent(2,"운영진용 · 데스크톱","두 역할은 함께 부여 가능");
  managerLabel.position = {left:500,top:552,width:280,height:24};
  const memberLabel = setTextByCurrent(2,"일반 사용자용 · 모바일","모두 기본 활동부터 시작");
  memberLabel.position = {left:500,top:644,width:280,height:24};
  moveShapeByBox([346,626,542,0], {left:640,top:352,width:0,height:38}, "#B8BCC4");
  moveShapeByBox([54,626,250,0], {left:370,top:390,width:540,height:0}, "#B8BCC4");
  const roleSlide = p.slides.getItem(1);
  addTag(roleSlide,"두 매니저 역할",414,301,116,"#FFEFB3","#6B5200");
  addTag(roleSlide,"크루 대표",538,301,84,"#FFEFB3","#6B5200");
  addTag(roleSlide,"역할 부여",630,301,84,"#FFEFB3","#6B5200");
  addTag(roleSlide,"PIN·학교 연동",722,301,124,"#FFEFB3","#6B5200");
  addTag(roleSlide,"가입 승인",154,466,88,"#EAF1FF","#27468F");
  addTag(roleSlide,"예약 운영",250,466,88,"#EAF1FF","#27468F");
  addTag(roleSlide,"결제·메모",346,466,96,"#EAF1FF","#27468F");
  addTag(roleSlide,"이용 통계",450,466,88,"#EAF1FF","#27468F");
  addTag(roleSlide,"호스트 그룹",694,460,104,"#E9ECF7","#253979");
  addTag(roleSlide,"이벤트 생성",806,460,104,"#E9ECF7","#253979");
  addTag(roleSlide,"참가자·결제",694,495,112,"#E9ECF7","#253979");
  addTag(roleSlide,"응답 시트",814,495,92,"#E9ECF7","#253979");
  addTag(roleSlide,"크루 확인",454,590,88,"#E4F2EA","#256746");
  addTag(roleSlide,"예약",550,590,58,"#E4F2EA","#256746");
  addTag(roleSlide,"이벤트 참가",616,590,104,"#E4F2EA","#256746");
  addTag(roleSlide,"내 일정",728,590,76,"#E4F2EA","#256746");
  setNotes(2, "역할은 배타적인 직급이 아니라 기본 권한 위에 필요한 운영 역할을 조합해 부여하는 구조입니다.");

  // Current terminology and role-distinctive tags.
  setTextAt(4,54,70,"운영 센터에서 담당 업무를 선택합니다");
  setTextAt(4,54,220,"이벤트 관리와 호스트 그룹 등 권한이 있는 업무만 표시됩니다.");
  setTextAt(4,102,437,"업무 영역 선택");
  setTextAt(4,102,472,"이벤트 관리 또는 호스트 그룹에서 담당 업무를 시작합니다.");
  await replaceImage(4,"operations-center-current.png",{left:0,top:0,right:0,bottom:0.03});
  setNotes(4,"현재 운영 센터는 이벤트 관리와 호스트 그룹을 중심으로 권한별 진입점을 제공합니다.");

  setTextAt(5,54,220,"크루 대표 권한과 두 매니저 역할을 함께 관리합니다.");
  setTextAt(5,102,325,"역할 부여");
  setTextAt(5,102,360,"크루 매니저와 이벤트 그룹 매니저 역할을 부여·회수합니다.");
  setTextAt(5,102,437,"크루 설정");
  setTextAt(5,102,472,"크루 이름, 가입 PIN, 학교 연동을 관리합니다.");
  setTextAt(5,102,549,"최종 책임");
  setTextAt(5,102,584,"두 운영 영역을 모두 맡고 크루를 대표합니다.");

  setTextAt(6,54,220,"가입과 예약 운영에 필요한 반복 업무를 한 흐름으로 처리합니다.");
  setTextAt(6,102,325,"가입·예약");
  setTextAt(6,102,360,"가입 신청과 예약 일정·정원을 관리합니다.");
  setTextAt(6,102,437,"결제·메모");
  setTextAt(6,102,472,"참가자의 결제 상태와 운영 메모를 갱신합니다.");
  setTextAt(6,102,549,"이용 통계");
  setTextAt(6,102,584,"크루 이용 현황을 확인해 다음 운영에 반영합니다.");

  setTextAt(7,54,70,"이벤트 그룹 매니저는 호스트 그룹을 운영합니다");
  setTextAt(7,54,166,"이벤트 그룹 매니저");
  setTextAt(7,54,220,"호스트 그룹과 이벤트, 참가자 응답까지 하나의 역할로 이어집니다.");
  setTextAt(7,102,325,"호스트 그룹");
  setTextAt(7,102,360,"참여 크루와 호스트 권한을 관리합니다.");
  setTextAt(7,102,437,"이벤트 운영");
  setTextAt(7,102,472,"이벤트를 만들고 모집·참가자를 관리합니다.");
  setTextAt(7,102,549,"응답 관리");
  setTextAt(7,102,584,"참가자 응답 시트와 결제 정보를 확인합니다.");
  await replaceImage(7,"host-groups-current.png",{left:0,top:0,right:0,bottom:0.04});
  setNotes(7,"이벤트 그룹 매니저는 현재 UI의 호스트 그룹과 이벤트 관리 흐름을 담당합니다.");

  setTextAt(8,54,70,"호스트를 관리하고 그룹 오너를 변경합니다");
  setTextAt(8,54,220,"참여 크루와 호스트 역할을 확인한 뒤 필요한 변경만 수행합니다.");
  setTextAt(8,102,325,"참여 크루");
  setTextAt(8,102,360,"그룹에 연결된 크루를 확인합니다.");
  setTextAt(8,102,437,"호스트 추가");
  setTextAt(8,102,472,"새 호스트를 추가하고 역할을 확인합니다.");
  setTextAt(8,102,549,"오너 이전");
  setTextAt(8,102,584,"왕관 아이콘으로 그룹 오너를 변경합니다.");
  await replaceImage(8,"host-members-current.png",{left:0,top:0,right:0,bottom:0.03});
  setNotes(8,"호스트 그룹 오너는 호스트 추가와 그룹 오너 변경을 수행할 수 있습니다.");

  setTextAt(9,54,70,"이벤트 목록에서 생성과 운영 상태를 관리합니다");
  setTextAt(9,54,220,"호스트 그룹의 이벤트를 한 표에서 찾고 상세 화면으로 이어갑니다.");
  setTextAt(9,102,325,"이벤트 관리 열기");
  setTextAt(9,102,360,"운영 센터에서 이벤트 관리를 엽니다.");
  setTextAt(9,102,437,"새 이벤트 만들기");
  setTextAt(9,102,472,"일정과 모집 정보, 응답 시트를 설정합니다.");
  setTextAt(9,102,549,"상세 운영 열기");
  setTextAt(9,102,584,"참가자·결제·응답 현황을 관리합니다.");

  // New response-sheet section.
  setTextAt(11,58,52,"NEW");
  setTextAt(11,58,208,"참가자 응답 시트");
  setTextAt(11,60,356,"이벤트 생성부터 참가자 제출 확인까지 한 흐름으로 이어집니다.");
  setNotes(11,"새로 추가된 참가자 응답 시트 기능의 운영 흐름을 소개합니다.");

  setTextAt(12,54,34,"이벤트 그룹 매니저 · 데스크톱");
  setTextAt(12,54,70,"필요한 템플릿을 조합해 응답 시트를 만듭니다");
  setTextAt(12,54,166,"응답 시트 만들기");
  setTextAt(12,54,220,"안전·개인정보·연락처·건강 정보 중 필요한 항목만 선택합니다.");
  setTextAt(12,102,325,"템플릿 선택");
  setTextAt(12,102,360,"여러 템플릿을 조합하거나 맞춤 항목을 추가합니다.");
  setTextAt(12,102,437,"응답 방식 설정");
  setTextAt(12,102,472,"체크·짧은 답변·전화번호·안내문 등을 선택합니다.");
  setTextAt(12,102,549,"작성 제한시간");
  setTextAt(12,102,584,"참가 신청 후 완료해야 할 시간을 설정합니다.");
  await overlayImage(12,"response-editor.png","cover");
  setNotes(12,"응답 시트 편집기는 빠른 템플릿, 맞춤 항목, 작성 제한시간을 제공합니다.");

  setTextAt(13,54,34,"이벤트 그룹 매니저 · 데스크톱");
  setTextAt(13,54,70,"참가자 화면을 미리 보고 응답 유형을 점검합니다");
  setTextAt(13,54,166,"미리보기");
  setTextAt(13,54,220,"저장 전에 실제 작성 화면과 필수 조건을 확인합니다.");
  setTextAt(13,102,325,"필수·선택 확인");
  setTextAt(13,102,360,"참가자가 반드시 완료할 항목을 확인합니다.");
  setTextAt(13,102,437,"응답 유형 확인");
  setTextAt(13,102,472,"체크박스와 연락처 입력이 의도대로 보이는지 확인합니다.");
  setTextAt(13,102,549,"미리보기 완료");
  setTextAt(13,102,584,"입력값은 저장되지 않으므로 화면만 안전하게 점검합니다.");
  await overlayImage(13,"response-preview.png","contain");
  setNotes(13,"미리보기는 참가자 입력을 저장하지 않고 작성 경험을 점검합니다.");

  setTextAt(14,54,34,"이벤트 그룹 매니저 · 데스크톱");
  setTextAt(14,54,70,"제출 현황을 확인하고 필요한 정보만 내보냅니다");
  setTextAt(14,54,166,"응답 관리");
  setTextAt(14,54,220,"민감정보는 가린 채 확인하고 필요할 때만 열거나 내보냅니다.");
  setTextAt(14,102,325,"제출 현황");
  setTextAt(14,102,360,"제출 완료와 미제출 참가자를 필터링합니다.");
  setTextAt(14,102,437,"개인정보 보호");
  setTextAt(14,102,472,"연락처와 민감정보는 기본적으로 가려집니다.");
  setTextAt(14,102,549,"XLSX 내보내기");
  setTextAt(14,102,584,"운영에 필요한 응답만 표 형태로 내보냅니다.");
  await overlayImage(14,"response-table.png","contain");
  setNotes(14,"운영진 응답 표는 제출 필터, 개인정보 보기, XLSX 내보내기를 제공합니다.");

  setTextAt(15,54,34,"일반 사용자 · 모바일");
  setTextAt(15,54,70,"응답 시트가 있으면 신청 뒤 작성 단계가 이어집니다");
  setTextAt(15,54,166,"참가자 작성 흐름");
  setTextAt(15,54,220,"참가비와 작성 조건을 확인하고 필수 항목을 제출해야 참가가 확정됩니다.");
  setTextAt(15,102,325,"참여 신청");
  setTextAt(15,102,360,"이벤트 정보와 참가비를 확인하고 신청합니다.");
  setTextAt(15,102,437,"자동 저장·복원");
  setTextAt(15,102,472,"작성 중 나가도 내용이 저장되어 이어서 작성할 수 있습니다.");
  setTextAt(15,102,549,"한 번에 제출");
  setTextAt(15,102,584,"필수 항목을 완료하고 전체 응답을 제출하면 참가가 확정됩니다.");
  await overlayImage(15,"mobile-event-response.png","contain");
  setNotes(15,"참가자는 신청 후 응답 시트를 작성하며, 초안은 자동 저장·복원되고 전체 응답을 한 번에 제출합니다.");

  // Updated user-facing event terminology in the preserved mobile section.
  setTextAt(16,60,356,"홈에서 이벤트를 찾고 신청한 뒤 내 일정과 계정 정보를 확인합니다.");
  setTextAt(18,54,70,"이벤트 목록에서 조건에 맞는 이벤트를 찾습니다");
  setTextAt(18,54,216,"필터와 카드 정보를 함께 보고 참여할 이벤트를 고릅니다.");
  setTextAt(18,793,478,"관심 있는 이벤트 카드를 눌러 상세 내용을 봅니다.");
  setTextAt(20,54,70,"나의 이벤트에서 신청 상태와 일정을 확인합니다");
  setTextAt(17,793,478,"홈·이벤트·나의 이벤트·내 정보로 바로 이동합니다.");
  setTextAt(21,793,254,"달력에서 예약과 이벤트 일정을 확인합니다.");
  setTextAt(22,702,314,"이벤트 찾기  →  상세 확인  →  참여 신청\n\n나의 이벤트에서 신청 상태와 일정을 다시 확인합니다.");

  // Closing quick reference terminology.
  const closing = p.slides.getItem(21);
  for (const shape of closing.shapes.items) {
    const current = shape.text?.text ?? shape.text?.value ?? "";
    if (current === "소모임 찾기  →  상세 확인  →  참여 신청") shape.text = "이벤트 찾기  →  상세 확인  →  참여 신청";
    if (current.includes("나의 소모임에서 신청 상태와 일정을 다시")) shape.text = "나의 이벤트에서 신청 상태와 일정을 다시\n확인합니다.";
  }

  // Re-number all pages after inserting the five new slides.
  for (let slideNumber = 1; slideNumber <= p.slides.items.length; slideNumber += 1) {
    const candidates = records.filter((record) => record.slide === slideNumber && record.kind === "textbox" && record.bbox && record.bbox[0] > 1150 && record.bbox[1] > 640);
    if (candidates.length > 0) {
      p.resolve(candidates[0].id).text = String(slideNumber).padStart(2,"0");
    }
  }

  for (const [index, slide] of p.slides.items.entries()) {
    const stem = `slide-${String(index + 1).padStart(2,"0")}`;
    const png = await p.export({ slide, format: "png", scale: 1 });
    await fs.writeFile(path.join(RENDERED, `${stem}.png`), new Uint8Array(await png.arrayBuffer()));
    const layout = await slide.export({ format: "layout" });
    await fs.writeFile(path.join(RENDERED, `${stem}.layout.json`), await layout.text());
  }

  const pptx = await PresentationFile.exportPptx(p);
  await pptx.save(OUTPUT);
  console.log(OUTPUT);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
