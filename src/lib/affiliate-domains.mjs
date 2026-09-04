/**
 * 已知联盟/推广链接域名列表。
 *
 * remark-affiliate-disclosure 插件会扫描 Markdown 正文中的链接，命中下面任意一条规则时，
 * 在链接后面自动插入一个"推广链接"披露徽章（不修改链接文字和跳转目标）。
 *
 * 以后仓库里新增指向这些域名（或其子路径）的链接，都会被自动打上披露标签，无需手动改 Markdown 源文件。
 * 需要追加新的联盟域名时，直接往这个数组里加一条即可。
 *
 * @typedef {{ hostname: string, pathPrefix?: string }} AffiliateRule
 * @type {AffiliateRule[]}
 */
export const AFFILIATE_LINK_RULES = [
  { hostname: "cursor.com", pathPrefix: "/referral" },
];

/**
 * 判断一个 URL 字符串是否命中已知联盟域名规则。
 * 非法 URL（例如站内相对路径）直接返回 false，不抛错。
 * @param {string} url
 * @returns {boolean}
 */
export function isAffiliateLink(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  const hostname = parsed.hostname.replace(/^www\./, "");

  return AFFILIATE_LINK_RULES.some((rule) => {
    if (hostname !== rule.hostname) return false;
    if (rule.pathPrefix && !parsed.pathname.startsWith(rule.pathPrefix)) return false;
    return true;
  });
}
