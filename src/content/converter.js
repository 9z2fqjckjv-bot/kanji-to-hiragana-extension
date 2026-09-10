/**
 * Kuroshiro-based kanji → hiragana converter for the content script.
 * Dictionary is loaded from extension packaged dict/ via chrome.runtime.getURL.
 */

import Kuroshiro from "kuroshiro";
import KuromojiAnalyzer from "kuroshiro-analyzer-kuromoji";
import { applyOverrides } from "./overrides.js";

let kuroshiro = null;
let initPromise = null;

export async function initConverter() {
  if (kuroshiro) return kuroshiro;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const instance = new Kuroshiro();
    const dictPath = chrome.runtime.getURL("dict/");
    await instance.init(
      new KuromojiAnalyzer({
        dictPath,
      })
    );
    kuroshiro = instance;
    return kuroshiro;
  })();

  try {
    return await initPromise;
  } catch (err) {
    initPromise = null;
    throw err;
  }
}

/**
 * Convert Japanese text: kanji → hiragana, keep kana/Latin/numbers/punct.
 */
export async function toHiragana(text) {
  if (!text || !/[一-龯々〆ヵヶ]/.test(text)) {
    return text;
  }
  const prepared = applyOverrides(text);
  if (!/[一-龯々〆ヵヶ]/.test(prepared)) {
    return prepared;
  }
  const ks = await initConverter();
  return ks.convert(prepared, {
    to: "hiragana",
    mode: "normal",
  });
}

export function hasKanji(text) {
  return /[一-龯々〆ヵヶ]/.test(text);
}
