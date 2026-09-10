/**
 * Small educational overrides for common kuromoji misreadings.
 * Applied before morphological conversion (longest-first).
 */
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
];

// Sort longest first so multi-char compounds win
PAIRS.sort((a, b) => b[0].length - a[0].length);

export function applyOverrides(text) {
  let out = text;
  for (const [from, to] of PAIRS) {
    if (out.includes(from)) {
      out = out.split(from).join(to);
    }
  }
  return out;
}
