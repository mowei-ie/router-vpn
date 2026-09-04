/**
 * remark-strip-first-heading
 *
 * 文章 Markdown 正文第一行始终是 `# 标题`（与 frontmatter 的 title 字段内容一致）。
 * 页面布局会用 frontmatter.title 统一渲染一次 <h1>，因此这里需要去掉正文中的第一个
 * 顶级标题节点（depth === 1），避免同一页面出现两个 <h1>。
 *
 * 只移除处于 tree.children 顶层、且是文档中第一个出现的 heading(depth=1) 节点；
 * 不会影响正文后续可能出现的二级、三级标题。
 */
export default function remarkStripFirstHeading() {
  return (tree) => {
    const index = tree.children.findIndex(
      (node) => node.type === "heading" && node.depth === 1
    );
    if (index !== -1) {
      tree.children.splice(index, 1);
    }
  };
}
