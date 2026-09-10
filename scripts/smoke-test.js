/**
 * Node smoke test for kuroshiro conversion (same stack as the extension).
 * Does not exercise Chrome APIs — only reading conversion quality.
 */
const path = require("path");
const Kuroshiro = require("kuroshiro").default || require("kuroshiro");
const KuromojiAnalyzer = require("kuroshiro-analyzer-kuromoji").default || require("kuroshiro-analyzer-kuromoji");

const PAIRS = [
  ["仮名交じり", "かなまじり"],
  ["漢字仮名", "かんじかな"],
  ["仮名", "かな"],
  ["一寸", "ちょっと"],
  ["今日", "きょう"],
  ["明日", "あした"],
  ["昨日", "きのう"],
  ["大人", "おとな"],
  ["一人", "ひとり"],
  ["二人", "ふたり"],
  ["出来る", "できる"],
  ["分かる", "わかる"],
  ["言う", "いう"],
].sort((a, b) => b[0].length - a[0].length);

function applyOverrides(text) {
  let out = text;
  for (const [from, to] of PAIRS) {
    if (out.includes(from)) out = out.split(from).join(to);
  }
  return out;
}

async function main() {
  const kuroshiro = new Kuroshiro();
  const dictPath = path.join(__dirname, "..", "node_modules", "kuromoji", "dict");
  await kuroshiro.init(new KuromojiAnalyzer({ dictPath }));

  const samples = [
    ["漢字仮名交じり文", "かんじかなまじりぶん"],
    ["今日は良い天気です", "きょうはよいてんきです"],
    ["小学校で勉強する", "しょうがっこうでべんきょうする"],
    ["Hello 世界 123", "Hello せかい 123"],
    ["カタカナはそのまま", "カタカナはそのまま"],
  ];

  let failed = 0;
  for (const [input, expected] of samples) {
    const prepared = applyOverrides(input);
    const out = /[一-龯々〆ヵヶ]/.test(prepared)
      ? await kuroshiro.convert(prepared, { to: "hiragana", mode: "normal" })
      : prepared;
    const ok = out === expected;
    console.log(`${ok ? "OK" : "NG"}  ${input}  →  ${out}`);
    if (!ok) failed++;
    if (/[一-龯]/.test(out)) {
      console.log("  WARN: output still contains kanji");
      failed++;
    }
  }

  if (failed) {
    console.error(`Smoke test finished with ${failed} failure(s)`);
    process.exit(1);
  }
  console.log("Smoke test passed");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
