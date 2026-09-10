/**
 * Background service worker: per-tab enable state + inject content script on demand.
 */

/** tabId → boolean */
const tabEnabled = new Map();

async function ensureContentScript(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, { type: "K2H_GET_STATUS" });
    return true;
  } catch {
    // Not injected yet
  }
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"],
    });
    // Brief wait for listener registration
    await new Promise((r) => setTimeout(r, 50));
    return true;
  } catch (e) {
    console.warn("[k2h] inject failed", e);
    return false;
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "K2H_QUERY_TAB") {
    const tabId = sender.tab?.id;
    sendResponse({ enabled: tabId != null ? !!tabEnabled.get(tabId) : false });
    return false;
  }

  if (msg?.type === "K2H_TOGGLE") {
    (async () => {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab?.id) {
        sendResponse({ ok: false, error: "タブが見つかりません" });
        return;
      }
      // chrome:// and store pages cannot be scripted
      const url = tab.url || "";
      if (
        url.startsWith("chrome://") ||
        url.startsWith("chrome-extension://") ||
        url.startsWith("https://chrome.google.com/webstore") ||
        url.startsWith("edge://") ||
        url.startsWith("about:")
      ) {
        sendResponse({
          ok: false,
          error: "このページでは使えません（Chromeの内部ページなど）",
        });
        return;
      }

      const next = !tabEnabled.get(tab.id);
      tabEnabled.set(tab.id, next);

      const injected = await ensureContentScript(tab.id);
      if (!injected) {
        tabEnabled.set(tab.id, false);
        sendResponse({
          ok: false,
          error: "このページにスクリプトを入れられませんでした",
        });
        return;
      }

      try {
        const res = await chrome.tabs.sendMessage(tab.id, {
          type: "K2H_SET_ENABLED",
          enabled: next,
        });
        sendResponse({ ok: true, enabled: next, detail: res });
      } catch (e) {
        tabEnabled.set(tab.id, false);
        sendResponse({ ok: false, error: String(e) });
      }
    })();
    return true;
  }

  if (msg?.type === "K2H_POPUP_STATUS") {
    (async () => {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      const enabled = tab?.id != null ? !!tabEnabled.get(tab.id) : false;
      sendResponse({ enabled, tabId: tab?.id, url: tab?.url });
    })();
    return true;
  }

  return false;
});

chrome.tabs.onRemoved.addListener((tabId) => {
  tabEnabled.delete(tabId);
});

chrome.tabs.onUpdated.addListener((tabId, info) => {
  // On full navigation, content script is gone; keep flag and re-apply after load
  if (info.status === "complete" && tabEnabled.get(tabId)) {
    (async () => {
      const ok = await ensureContentScript(tabId);
      if (!ok) return;
      try {
        await chrome.tabs.sendMessage(tabId, {
          type: "K2H_SET_ENABLED",
          enabled: true,
        });
      } catch (e) {
        console.warn("[k2h] re-enable failed", e);
      }
    })();
  }
});
