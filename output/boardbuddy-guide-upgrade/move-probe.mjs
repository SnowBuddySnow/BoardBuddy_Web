import { FileBlob, PresentationFile } from "@oai/artifact-tool";
const p = await PresentationFile.importPptx(await FileBlob.load("/Users/jake/Desktop/Jake/Devs/BoardBuddy/BoardBuddy_사용설명서.pptx"));
const d = p.slides.getItem(2).duplicate();
d.moveTo(10);
const d2 = p.slides.getItem(8).duplicate(); d2.moveTo(11);
const d3 = p.slides.getItem(9).duplicate(); d3.moveTo(12);
const d4 = p.slides.getItem(9).duplicate(); d4.moveTo(13);
const d5 = p.slides.getItem(9).duplicate(); d5.moveTo(14);
const snap = await p.inspect({kind:"textbox",include:"slide,text,bbox",maxChars:250000});
const rows = snap.ndjson.split("\n").filter(Boolean).map(JSON.parse);
for (let n=1;n<=22;n+=1) {
  const title = rows.find((r)=>r.slide===n && r.kind==="textbox" && r.bbox?.[1]===70)?.text ?? rows.find((r)=>r.slide===n && r.kind==="textbox" && r.bbox?.[1]===208)?.text ?? "?";
  console.log(n,title);
}
