import path from "node:path";
import { visit } from "unist-util-visit";

/**
 * remark-rewrite-relative-md-links
 *
 * 仓库里的 Markdown 正文包含大量形如：
 *   [文字](../codex/codex-guide.md)
 *   [文字](./practice/xxx.md#anchor)
 *   [文字](codex-workflow.md#先划安全边界)
 * 这类"相对 .md 文件"链接，方便在 GitHub 上直接浏览。
 *
 * 本插件在 Astro 构建期把这些链接重写为站内路由，规则：
 *   1. 忽略外部链接（http:, https:, mailto: 等协议）、协议相对链接（//）、纯锚点（#foo）。
 *   2. 忽略不是 `.md` / `.md#anchor` 形式的链接（保持原样，包括代码块里的示例文本，
 *      代码块内容不会被 remark 解析为 link 节点，因此天然不受影响）。
 *   3. 按 Markdown 源文件的真实磁盘路径解析出目标文件相对仓库根目录的路径。
 *   4. `cursor/README.md`、`codex/README.md` 两个目录导览文件被融合进对应的分类
 *      落地页（/cursor/、/codex/），不是独立文章路由，因此单独映射到分类页。
 *   5. 根目录 `README.md` 映射到网站首页 `/`。
 *   6. 其余 `<dir>/<...>/<file>.md` 映射为 `/<dir>/<...>/<file>/`，并保留原始 `#anchor`。
 */

const EXTERNAL_PROTOCOL_RE = /^[a-z][a-z0-9+.-]*:/i;

const SPECIAL_ROUTES = new Map([
  ["cursor/README.md", "/cursor/"],
  ["codex/README.md", "/codex/"],
  ["README.md", "/"],
]);

export default function remarkRewriteRelativeMdLinks(options = {}) {
  const rootDir = options.rootDir ?? process.cwd();

  return (tree, file) => {
    visit(tree, "link", (node) => {
      const rewritten = rewriteUrl(node.url, file, rootDir);
      if (rewritten !== null) {
        node.url = rewritten;
      }
    });
  };
}

function rewriteUrl(url, file, rootDir) {
  if (!url) return null;
  if (EXTERNAL_PROTOCOL_RE.test(url)) return null;
  if (url.startsWith("//")) return null;
  if (url.startsWith("#")) return null;

  const hashIndex = url.indexOf("#");
  const pathPart = hashIndex === -1 ? url : url.slice(0, hashIndex);
  const hashPart = hashIndex === -1 ? "" : url.slice(hashIndex);

  if (!/\.md$/i.test(pathPart)) return null;

  const sourceFilePath = file.path ?? (file.history && file.history[0]);
  if (!sourceFilePath) return null;

  const sourceDir = path.dirname(sourceFilePath);
  let decodedPathPart;
  try {
    decodedPathPart = decodeURIComponent(pathPart);
  } catch {
    decodedPathPart = pathPart;
  }

  const absoluteTarget = path.resolve(sourceDir, decodedPathPart);
  const relativeToRoot = path
    .relative(rootDir, absoluteTarget)
    .split(path.sep)
    .join("/");

  const specialRoute = SPECIAL_ROUTES.get(relativeToRoot);
  if (specialRoute) {
    return hashPart ? `${specialRoute}${hashPart}` : specialRoute;
  }

  const withoutExt = relativeToRoot.replace(/\.md$/i, "");
  return `/${withoutExt}/${hashPart}`;
}
