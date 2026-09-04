export type Category = "cursor" | "chatgpt" | "codex" | "extras";

export interface CategoryMeta {
  slug: Category;
  label: string;
  shortLabel: string;
  description: string;
  /**
   * 分类落地页 <title> 专用文案，比 label 更长、更具体，用于满足搜索结果标题
   * 显示宽度 50-65 的建议区间；页面 H1 与面包屑仍使用 label，两者按 SEO 惯例分工。
   */
  seoTitle: string;
}

export const CATEGORIES: Record<Category, CategoryMeta> = {
  cursor: {
    slug: "cursor",
    label: "Cursor 专题",
    shortLabel: "Cursor",
    seoTitle: "Cursor 专题：套餐、Agent、部署与系统排障实战",
    description:
      "Cursor 专题：涵盖 Cursor 的套餐与模型选择、Agent 与安全审批机制、GitHub Pages 建站与自定义域名、SSH 远程开发、阿里云 ECS 部署 Web 应用、全栈小应用实战，以及用 Cursor Agent 辅助排查 Windows 系统故障，每篇均附带可执行步骤与风险边界说明。",
  },
  chatgpt: {
    slug: "chatgpt",
    label: "ChatGPT / OpenAI API",
    shortLabel: "ChatGPT",
    seoTitle: "ChatGPT / OpenAI API 教程：订阅与成本控制",
    description:
      "ChatGPT / OpenAI API 专题：介绍 ChatGPT 个人订阅方案（Free / Go / Plus / Pro）的选择与账单管理方法，以及 OpenAI API 的接入方式、密钥安全管理与成本控制技巧，帮助你分清两套独立计费产品并按需选用，避免重复付费、误开高价套餐或密钥泄露风险。",
  },
  codex: {
    slug: "codex",
    label: "OpenAI Codex 专题",
    shortLabel: "Codex",
    seoTitle: "OpenAI Codex 教程：入口、CLI、工作流与定制实战",
    description:
      "OpenAI Codex 专题：介绍 OpenAI Codex 的产品入口与登录方式、CLI 命令行上手步骤、AGENTS.md 与 config.toml 工程化定制技巧、可审阅的 Git 工作流设计，以及接入 DeepSeek 等第三方模型的安全配置方法，帮助你把 Codex 真正用进日常研发与团队协作场景。",
  },
  extras: {
    slug: "extras",
    label: "扩展与部署",
    shortLabel: "Extras",
    seoTitle: "扩展与部署实战教程：自建统计与远程访问方案",
    description:
      "扩展与部署专题：收录与 AI 编程主线相关的扩展实践内容，包括基于 Supabase 的自建访问统计服务从建库、前端接入到数据库分区与 Redis 缓存性能优化的完整部署步骤，以及使用 Tailscale 在没有公网 IP 的情况下安全远程访问 ESXi 管理界面的实战案例，适合有运维基础的读者延伸阅读。",
  },
};

export const CATEGORY_ORDER: Category[] = ["cursor", "chatgpt", "codex", "extras"];
