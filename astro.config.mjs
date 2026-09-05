// @ts-check
import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";
import { unified } from "@astrojs/markdown-remark";

import remarkStripFirstHeading from "./src/lib/remark-strip-first-heading.mjs";
import remarkRewriteRelativeMdLinks from "./src/lib/remark-rewrite-relative-md-links.mjs";
import remarkAffiliateDisclosure from "./src/lib/remark-affiliate-disclosure.mjs";
import { getThinTags, tagSlug } from "./src/lib/tag-stats.mjs";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

// 稀薄标签页（非 draft 文章数 < TAG_INDEX_MIN_ARTICLES）对应的 `/tags/<slug>/` 完整 path，
// 用于从 sitemap 里剔除；与 src/pages/tags/[tag].astro 的 noindex 判断共用同一份统计模块，
// 避免“sitemap 剔除的标签”和“页面 noindex 的标签”出现不一致。
const thinTagPaths = new Set(getThinTags().map((tag) => `/tags/${tagSlug(tag)}/`));

// https://astro.build/config
export default defineConfig({
  site: "https://www.aixiaobai168.com",
  trailingSlash: "always",
  build: {
    format: "directory",
  },
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [
    sitemap({
      // draft 内容在 src/pages/[...slug].astro、分类页、标签页的 getCollection 调用里
      // 已经通过 `!data.draft` 过滤，从未生成对应路由，因此天然不会出现在 sitemap 里。
      // 这里的 filter 是第二层防御：万一将来新增页面忘了过滤 draft，仍能兜底排除。
      //
      // 第二层规则：稀薄标签页（见 thinTagPaths）从 sitemap 剔除，避免索引膨胀；
      // `/tags/` 索引页本身不受影响，始终保留。
      filter: (page) => {
        if (page.includes("/__draft")) return false;
        const { pathname } = new URL(page);
        return !thinTagPaths.has(pathname);
      },
    }),
  ],
  markdown: {
    // Astro 7 默认使用 Sätteri 处理器；显式切回基于 unified/remark 的处理器，
    // 才能挂载我们的自定义 remark 插件（.md 内链重写 + 去重首个 H1 + 联盟链接披露）。
    processor: unified({
      remarkPlugins: [
        [remarkRewriteRelativeMdLinks, { rootDir }],
        remarkStripFirstHeading,
        remarkAffiliateDisclosure,
      ],
    }),
  },
});
