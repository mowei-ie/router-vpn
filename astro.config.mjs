// @ts-check
import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";
import { unified } from "@astrojs/markdown-remark";

import remarkStripFirstHeading from "./src/lib/remark-strip-first-heading.mjs";
import remarkRewriteRelativeMdLinks from "./src/lib/remark-rewrite-relative-md-links.mjs";
import remarkAffiliateDisclosure from "./src/lib/remark-affiliate-disclosure.mjs";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

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
      filter: (page) => !page.includes("/__draft"),
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
