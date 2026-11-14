const fs = require("fs");

const data = JSON.parse(fs.readFileSync("data.json", "utf8"));
const kanjiSec = data.kanji || {};
const existing = {};
const existingChars = new Set();
for (const level of Object.keys(kanjiSec)) {
  existing[level] = kanjiSec[level].length;
  for (const it of kanjiSec[level]) existingChars.add(it.kanji);
}
console.log("Existing kanji per level:", existing);
console.log("Total existing kanji:", existingChars.size);

const src = JSON.parse(fs.readFileSync("D:/Download D/chrome/kanji.json", "utf8"));
const chars = Object.keys(src);
console.log("Source total entries:", chars.length);

const byJlpt = {};
let noJlpt = 0;
for (const ch of chars) {
  const j = src[ch].jlpt_new;
  if (j == null) { noJlpt++; continue; }
  byJlpt[j] = (byJlpt[j] || 0) + 1;
}
console.log("Source by jlpt_new:", byJlpt, "noJlpt:", noJlpt);

// New kanji (not already in data.json) by jlpt
const newByLevel = {};
for (const ch of chars) {
  const j = src[ch].jlpt_new;
  if (j == null) continue;
  const level = "N" + j;
  if (existingChars.has(ch)) continue;
  newByLevel[level] = (newByLevel[level] || 0) + 1;
}
console.log("NEW (not in data.json) by level:", newByLevel);

// sample entry
console.log("Sample:", JSON.stringify(src[chars[0]], null, 1));
