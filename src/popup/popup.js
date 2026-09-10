const toggleBtn = document.getElementById("toggleBtn");
const statusLabel = document.getElementById("statusLabel");
const messageEl = document.getElementById("message");

function setUi(enabled) {
  statusLabel.textContent = enabled ? "オン" : "オフ";
  statusLabel.classList.toggle("on", enabled);
  statusLabel.classList.toggle("off", !enabled);
  toggleBtn.textContent = enabled ? "オフにする" : "オンにする";
  toggleBtn.classList.toggle("is-on", enabled);
  toggleBtn.setAttribute("aria-pressed", enabled ? "true" : "false");
}

function showMessage(text) {
  if (!text) {
    messageEl.hidden = true;
    messageEl.textContent = "";
    return;
  }
  messageEl.hidden = false;
  messageEl.textContent = text;
}

async function refresh() {
  try {
    const res = await chrome.runtime.sendMessage({ type: "K2H_POPUP_STATUS" });
    setUi(!!res?.enabled);
  } catch (e) {
    showMessage("状態を取得できませんでした");
  }
}

toggleBtn.addEventListener("click", async () => {
  showMessage("");
  toggleBtn.disabled = true;
  try {
    const res = await chrome.runtime.sendMessage({ type: "K2H_TOGGLE" });
    if (!res?.ok) {
      showMessage(res?.error || "切り替えに失敗しました");
      await refresh();
      return;
    }
    setUi(!!res.enabled);
  } catch (e) {
    showMessage(String(e));
  } finally {
    toggleBtn.disabled = false;
  }
});

refresh();
