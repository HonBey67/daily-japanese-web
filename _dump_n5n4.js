const fs = require("fs");
const data = JSON.parse(fs.readFileSync("data.json", "utf8"));
const src = JSON.parse(fs.readFileSync("D:/Download D/chrome/kanji.json", "utf8"));

const existing = new Set();
for (const lv of Object.keys(data.kanji)) for (const k of data.kanji[lv]) existing.add(k.kanji);

// clean a reading: remove ., -, and leading okurigana markers; keep base
const cleanReading = (r) => r.replace(/[.\-]/g, "").trim();
const cleanWk = (r) => r.replace(/^[!^]/, "").trim();

function readings(arr) {
  // dedup cleaned, keep order, limit 3
  const out = [];
  for (const r of arr) {
    const c = cleanReading(r);
    if (c && !out.includes(c)) out.push(c);
    if (out.length >= 3) break;
  }
  return out;
}

for (const lv of ["5", "4"]) {
  const list = [];
  for (const ch of Object.keys(src)) {
    const e = src[ch];
    if (e.jlpt_new !== Number(lv)) continue;
    if (existing.has(ch)) continue;
    list.push({
      kanji: ch,
      meanings: e.meanings,
      kun: readings(e.readings_kun),
      on: readings(e.readings_on),
      freq: e.freq,
    });
  }
  // sort by freq ascending (more common first)
  list.sort((a, b) => (a.freq || 99999) - (b.freq || 99999));
  fs.writeFileSync(`_n${lv}_raw.json`, JSON.stringify(list, null, 1), "utf8");
  console.log(`N${lv}: ${list.length} new kanji -> _n${lv}_raw.json`);
}
