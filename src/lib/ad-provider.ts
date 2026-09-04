/**
 * 广告适配层的地域/开关判断逻辑。
 *
 * 目标受众以海外中文读者为主；大陆读者尽力优化但不做备案。AdSense 只面向"能正常加载
 * adsense.googleapis.com / google.com 相关资源"的访客，大陆流量走另一套渠道（暂未接入，
 * 因此当前对大陆访客直接返回 "none"，不硬编码只支持 AdSense 一种未来渠道）。
 */

export type AdProvider = "adsense" | "none";

/**
 * 判断当前请求应该使用哪个广告提供方。
 *
 * TODO(地域判断真实接入)：目前没有真实的访客地域检测能力，先固定返回环境变量开关控制的结果。
 * 未来接入方式（任选其一，看最终落地在哪个边缘/CDN 层）：
 *   - Cloudflare Pages：读取 `request.cf.country`（Cloudflare 边缘自动注入的国家码），
 *     country === "CN" 时归为大陆流量；
 *   - 或者在 Cloudflare Worker / Pages Function 里把 `cf.country` 写入一个自定义请求头
 *     （例如 `X-Geo-Country`）转发给 Astro，这里改成读取 `Astro.request.headers.get("x-geo-country")`；
 *   - 或者前端探测 `adsense.googleapis.com` 是否可达（超时判定），失败时降级为 "none"，
 *     但这种方式有额外的运行时开销和延迟，优先级低于边缘层判断。
 * 接入后，大陆流量应返回 "none"（或未来新增的大陆广告渠道标识），非大陆流量在开关打开时返回 "adsense"。
 *
 * @param request 可选：传入 Astro.request，为未来读取地域请求头/cookie 预留参数位。
 */
export function getAdProvider(request?: Request): AdProvider {
  const adsEnabled = import.meta.env.PUBLIC_ADS_ENABLED === "true";
  if (!adsEnabled) return "none";

  // TODO(地域判断真实接入)：这里先固定放行，不做任何地域区分。
  // 预留读取自定义地域请求头的位置，接入后按上面的说明替换成真实判断：
  // const geoCountry = request?.headers.get("x-geo-country");
  // if (geoCountry === "CN") return "none";
  void request;

  return "adsense";
}
