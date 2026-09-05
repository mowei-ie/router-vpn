/**
 * consent-client.js
 *
 * 轻量同意状态管理：纯 localStorage，无第三方依赖。
 * 供 ConsentBanner / AdSlot 等客户端脚本共用。
 *
 * 存储结构说明：STORAGE_KEY 目前存的是一个笼统的"granted"/"denied"值，语义上现在只代表
 * "广告 Cookie 同意状态"——Cloudflare Web Analytics（Analytics.astro）不再读取这个值，
 * 页面加载即直接注入 beacon，不受同意门控。这里没有把存储结构拆成 `{ analytics, ads }`
 * 两个字段：一是当前只有广告场景还在用它，没有必要引入分类字段；二是不想改变已经写入访客
 * 浏览器 localStorage 的取值格式，避免破坏兼容性。如果未来又出现需要同意才能加载的分析/
 * 跟踪脚本，再考虑扩展成分类存储。
 */
const STORAGE_KEY = "cookie-consent"; // 取值："granted" | "denied"（现在只代表广告 Cookie 同意状态）
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
