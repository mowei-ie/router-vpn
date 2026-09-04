import { visit } from "unist-util-visit";
import { isAffiliateLink } from "./affiliate-domains.mjs";

/**
 * remark-affiliate-disclosure
 *
 * 扫描 Markdown 正文中的链接，命中 `affiliate-domains.mjs` 里已知联盟/推广域名列表的链接，
 * 会在链接后面自动插入一个 inline 的"推广链接"披露徽章：
 *
 *   [Cursor 推广链接](https://cursor.com/referral?code=xxx)
 *   -> <a href="...">Cursor 推广链接</a><span class="affiliate-badge">推广链接</span>
 *
 * 不修改原链接的文字和跳转目标，只是紧跟着插入一个 inline HTML 节点。
 * 依赖 Astro markdown 处理链上默认开启的 `allowDangerousHtml` + `rehype-raw`，
 * 所以这里可以直接插入 mdast `html` 类型节点，构建期会被正确解析为真实 DOM 节点。
 */
const BADGE_HTML =
  '<span class="affiliate-badge" title="本链接为推广/联盟链接，通过它完成的注册或购买可能为本站带来佣金">推广链接</span>';

export default function remarkAffiliateDisclosure() {
  return (tree) => {
    visit(tree, "link", (node, index, parent) => {
      if (!parent || typeof index !== "number") return;
      if (!isAffiliateLink(node.url)) return;

      parent.children.splice(index + 1, 0, {
        type: "html",
        value: BADGE_HTML,
      });

      // 跳过刚插入的徽章节点，避免 visit 因为数组被修改而重复处理。
      return index + 2;
    });
  };
}
