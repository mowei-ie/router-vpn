/**
 * consent-client.js
 *
 * 轻量同意状态管理：纯 localStorage，无第三方依赖。
 * 供 ConsentBanner / AdSlot / Analytics 等客户端脚本共用。
 */
const STORAGE_KEY = "cookie-consent"; // 取值："granted" | "denied"
const EVENT_NAME = "consent-changed";

/** @returns {"granted" | "denied" | null} null 表示访客还没有做出选择 */
export function getConsent() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    // localStorage 不可用（隐私模式/浏览器限制），视为"未选择"，本次会话不记忆。
    return null;
  }
}

/** @param {"granted" | "denied"} value */
export function setConsent(value) {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // 静默忽略：写入失败时至少仍能通过事件通知当前页面的监听者。
  }
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { value } }));
}

/** @param {(value: "granted" | "denied") => void} callback */
export function onConsentChange(callback) {
  window.addEventListener(EVENT_NAME, (event) => {
    callback(event.detail.value);
  });
}
