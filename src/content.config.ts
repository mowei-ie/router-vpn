import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// 16 篇正式教程文章：直接从仓库现有目录读取 Markdown，不做任何复制/迁移。
// base "." 相对项目根目录解析；用 "!" 排除两个目录导览 README（它们融合进分类落地页，
// 不作为独立文章）。
const articles = defineCollection({
  loader: glob({
    base: ".",
    pattern: [
      "cursor/**/*.md",
      "!cursor/README.md",
      "chatgpt/*.md",
      "codex/**/*.md",
      "!codex/README.md",
      "extras/*.md",
    ],
  }),
  schema: z.object({
    title: z.string(),
    description: z.string().min(150).max(160),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    category: z.enum(["cursor", "chatgpt", "codex", "extras"]),
    tags: z.array(z.string()).min(1).max(5),
    draft: z.boolean().default(false),
    order: z.number().optional(),
    // 人工复核占位字段：本次迁移不虚构，默认留空。
    reviewedBy: z.string().optional(),
    reviewedAt: z.coerce.date().optional(),
    // 复核提示（可选）：AI 辅助核查后，写清"哪一句、为什么存疑、需要核对什么"，
    // 供维护者人工复核时参照；不代表内容已确认有误。不要在这里伪造人工复核结论。
    reviewNotes: z.array(z.string()).optional(),
  }),
});

// 两个目录导览 README（cursor/README.md、codex/README.md），用于渲染对应分类
// 落地页顶部的专题导览内容；不需要文章级 frontmatter schema。
const sectionIntros = defineCollection({
  loader: glob({
    base: ".",
    pattern: ["cursor/README.md", "codex/README.md"],
  }),
  schema: z.object({}),
});

export const collections = { articles, sectionIntros };
