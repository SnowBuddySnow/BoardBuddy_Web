import { FileBlob, PresentationFile } from "@oai/artifact-tool";

const p = await PresentationFile.importPptx(await FileBlob.load("/Users/jake/Desktop/Jake/Devs/BoardBuddy/BoardBuddy_사용설명서.pptx"));
const s = p.slides.getItem(1);
console.log("slide keys", Object.keys(s));
console.log("shape keys", Object.keys(s.shapes));
console.log("shape count", s.shapes.items?.length, s.shapes.items?.map((x) => ({keys:Object.keys(x), text:x.text?.text ?? x.text?.value ?? String(x.text ?? ""), pos:x.position})).slice(0,6));
console.log("image keys", Object.keys(s.images), s.images.items?.length);
const s9 = p.slides.getItem(8);
console.log("slide9 items", s9.shapes.items.map((x, i) => ({i, type:x.type, text:x.text?.text ?? "", pos:{left:x.position?.left,top:x.position?.top,width:x.position?.width,height:x.position?.height}})));

const titles = () => p.slides.items.map((slide, i) => `${i + 1}:${slide.shapes.items.map((x)=>x.text?.text ?? "").filter(Boolean).slice(0,2).join("|")}`);
console.log("BEFORE", titles());
const d1 = p.slides.getItem(2).duplicate();
console.log("D1", titles()); d1.moveTo(10); console.log("M1", titles());
const d2 = p.slides.getItem(8).duplicate();
console.log("D2", titles()); d2.moveTo(11); console.log("M2", titles());
const d3 = p.slides.getItem(9).duplicate();
console.log("D3", titles()); d3.moveTo(12); console.log("M3", titles());
const d4 = p.slides.getItem(9).duplicate();
console.log("D4", titles()); d4.moveTo(13); console.log("M4", titles());
const d5 = p.slides.getItem(13).duplicate();
console.log("D5", titles()); d5.moveTo(14); console.log("M5", titles());
const snap = await p.inspect({kind:"slide,textbox",include:"id,slide,text,bbox",maxChars:250000});
const rows = snap.ndjson.split("\n").filter(Boolean).map(JSON.parse);
for (let n=1; n<=p.slides.items.length; n += 1) {
  console.log("SLIDE", n, rows.filter((r)=>r.slide===n && r.kind==="textbox").slice(0,5).map((r)=>({text:r.text,bbox:r.bbox})));
}
