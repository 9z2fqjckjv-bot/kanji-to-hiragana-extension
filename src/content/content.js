/**
 * Content script: walk visible text nodes, replace kanji with hiragana,
 * observe DOM mutations while enabled. Restore originals on disable.
 */

import { initConverter, toHiragana, hasKanji } from "./converter.js";

const SKIP_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "TEXTAREA",
  "INPUT",
  "CODE",
  "PRE",
  "KBD",
  "SAMP",
  "SVG",
  "MATH",
  "IFRAME",
  "OBJECT",
  "EMBED",
]);

/** Map Text node → original textContent (WeakMap so GC works) */
const originals = new WeakMap();
/** Strong refs so we can restore even if nodes leave active tree briefly */
const trackedNodes = new Set();

let enabled = false;
let observer = null;
let converting = false;
let ready = false;

function shouldSkip(node) {
  let el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
  while (el) {
    if (SKIP_TAGS.has(el.tagName)) return true;
    if (el.isContentEditable) return true;
    if (el.getAttribute && el.getAttribute("data-k2h-skip") === "1") return true;
    el = el.parentElement;
  }
  return false;
}

function collectTextNodes(root) {
  const nodes = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue || !node.nodeValue.trim()) {
        return NodeFilter.FILTER_REJECT;
      }
      if (shouldSkip(node)) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let n;
  while ((n = walker.nextNode())) {
    nodes.push(n);
  }
  return nodes;
}

async function convertNode(node) {
  if (!enabled || !node.isConnected) return;
  const current = node.nodeValue;
  if (!hasKanji(current)) return;

  if (!originals.has(node)) {
    originals.set(node, current);
    trackedNodes.add(node);
  }

  const source = originals.get(node);
  try {
    const converted = await toHiragana(source);
    if (!enabled || !node.isConnected) return;
    // Only update if still matching original source (avoid fighting user edits)
    if (node.nodeValue === source || node.nodeValue === originals.get(node)) {
      if (converted !== node.nodeValue) {
        node.nodeValue = converted;
      }
    }
  } catch (e) {
    console.warn("[k2h] convert failed:", e);
  }
}

async function convertAll(root = document.body) {
  if (!enabled || !root) return;
  converting = true;
  try {
    await initConverter();
    const nodes = collectTextNodes(root);
    // Batch in chunks to keep UI responsive
    const CHUNK = 40;
    for (let i = 0; i < nodes.length; i += CHUNK) {
      if (!enabled) break;
      const slice = nodes.slice(i, i + CHUNK);
      await Promise.all(slice.map(convertNode));
      // yield
      await new Promise((r) => setTimeout(r, 0));
    }
  } finally {
    converting = false;
  }
}

function restoreAll() {
  for (const node of trackedNodes) {
    const orig = originals.get(node);
    if (orig != null && node.isConnected) {
      node.nodeValue = orig;
    }
  }
  trackedNodes.clear();
}

function startObserver() {
  if (observer) return;
  observer = new MutationObserver((mutations) => {
    if (!enabled || converting) return;
    const roots = new Set();
    for (const m of mutations) {
      if (m.type === "characterData" && m.target && m.target.nodeType === Node.TEXT_NODE) {
        // Skip our own writes: if node is already tracked and value is converted, ignore
        if (originals.has(m.target)) continue;
        convertNode(m.target);
      } else if (m.type === "childList") {
        m.addedNodes.forEach((n) => {
          if (n.nodeType === Node.TEXT_NODE) {
            convertNode(n);
          } else if (n.nodeType === Node.ELEMENT_NODE && !shouldSkip(n)) {
            roots.add(n);
          }
        });
      }
    }
    roots.forEach((r) => convertAll(r));
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });
}

function stopObserver() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
}

async function enable() {
  if (enabled) return;
  enabled = true;
  startObserver();
  await convertAll(document.body);
}

function disable() {
  enabled = false;
  stopObserver();
  restoreAll();
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "K2H_SET_ENABLED") {
    (async () => {
      try {
        if (msg.enabled) {
          await enable();
        } else {
          disable();
        }
        sendResponse({ ok: true, enabled });
      } catch (e) {
        console.error("[k2h]", e);
        sendResponse({ ok: false, error: String(e) });
      }
    })();
    return true;
  }
  if (msg?.type === "K2H_GET_STATUS") {
    sendResponse({ enabled, ready });
    return false;
  }
  return false;
});

// Init: check per-tab flag from background
(async () => {
  try {
    const res = await chrome.runtime.sendMessage({ type: "K2H_QUERY_TAB" });
    ready = true;
    if (res?.enabled) {
      await enable();
    }
  } catch (e) {
    ready = true;
    console.warn("[k2h] init query failed", e);
  }
})();
